/**
 * LLM-based material categorization for technician estimates.
 *
 * After a technician submits an estimate (with plain item names + prices),
 * this function calls GPT to classify each item into one of three categories:
 *   - drobny_material  — small consumables (seals, tape, screws, silicone...)
 *   - nahradny_diel    — spare parts / components (pump, thermostat, valve...)
 *   - material         — construction/installation materials (pipes, cables, hoses...)
 *
 * Runs fire-and-forget after estimate save — no latency for the technician.
 */

import { chatCompletion, parseLLMJson, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import { query } from '@/lib/db'

export type MaterialCategory = 'drobny_material' | 'nahradny_diel' | 'material'

export interface RawEstimateMaterial {
  id: string
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  type?: MaterialCategory
}

const SYSTEM_PROMPT = `Si klasifikačný engine pre materiál v servisných zákazkách (inštalatérstvo, elektrika, kúrenárstvo, zámočníctvo).

Klasifikuj každú položku do jednej z troch kategórií:
- "drobny_material": spotrebný materiál nízkej hodnoty, ktorý technik nosí so sebou — tesnenia, pásky, skrutky, silikón, lepidlo, drôt, spojky, spony
- "nahradny_diel": konkrétny komponent/diel, ktorý sa vymieňa — čerpadlo, termostat, ventil, poistka, spínač, motor, kondenzátor, bojler, zámok
- "material": stavebný alebo inštalačný materiál — rúrky, káble, hadice, tmel, farba, betón, izolácia, dosky

Vráť STRIKTNE iba JSON pole v tomto formáte, bez akéhokoľvek textu navyše:
[{"id":"<id>","type":"<kategória>"},...]`

export async function categorizeMaterials(
  jobId: number,
  materials: RawEstimateMaterial[],
): Promise<void> {
  if (materials.length === 0) return

  // Items that already have a type — skip them
  const toClassify = materials.filter(m => !m.type)
  if (toClassify.length === 0) return

  try {
    const itemsJson = JSON.stringify(
      toClassify.map(m => ({ id: m.id, name: m.name, unit: m.unit }))
    )

    const raw = await chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: itemsJson,
      model: TIER_A_MODEL,
      provider: TIER_A_PROVIDER,
      maxTokens: 500,
    })

    if (!raw) {
      console.error('[CATEGORIZE] Empty response from LLM')
      return
    }

    // Strip markdown code fences if present
    const jsonText = raw.startsWith('```')
      ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : raw

    const classified = parseLLMJson<Array<{ id: string; type: MaterialCategory }>>(jsonText)
    if (!classified) {
      console.error('[CATEGORIZE] Failed to parse LLM response for job', jobId)
      return
    }

    // Merge types back into original materials array
    const typeMap = new Map(classified.map(c => [c.id, c.type]))
    const updated = materials.map(m => ({
      ...m,
      type: typeMap.get(m.id) ?? m.type ?? 'material',
    }))

    console.log('[CATEGORIZE] Classified materials for job', jobId, ':', updated.map(m => `${m.name}→${m.type}`).join(', '))

    // Persist back to DB
    await query(
      `UPDATE jobs
       SET custom_fields = jsonb_set(
         custom_fields,
         '{estimate_materials}',
         $1::jsonb
       )
       WHERE id = $2`,
      [JSON.stringify(updated), jobId]
    )

    console.log('[CATEGORIZE] Updated estimate_materials for job', jobId)
  } catch (err) {
    // Non-blocking — log and move on
    console.error('[CATEGORIZE] Failed to categorize materials for job', jobId, ':', err)
  }
}
