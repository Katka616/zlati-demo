/**
 * LLM Material Classifier — GPT-4.1 based classification of materials.
 *
 * Classifies materials into types and determines insurance coverage.
 * Falls back to rule-based system (partnerCoverageRules) if LLM fails.
 */

import { chatCompletion, parseLLMJson, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import type { MaterialItem, MaterialType, CoverageRuleContext, CoverageVerdict, MaterialListResult } from '@/lib/partnerCoverageRules/types'
import { evaluateMaterialList as evaluateRuleBased } from '@/lib/partnerCoverageRules'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MaterialCategory =
  | 'drobny_material'     // matice, šrouby, těsnění, silikón, pásky, konopí
  | 'nahradny_diel'       // sifón, ventil, baterie, termostat, čerpadlo, hadice
  | 'cely_spotrebic'      // pračka, lednice, sporák, myčka, sušička, mikrovlnka
  | 'cela_sanita'         // umývadlo, toaleta, vana, sprchový kout, bidet, dřez
  | 'osvetleni'           // svítidlo, žárovka, lustr, zářivka
  | 'cele_zariadeni'      // bojler komplet, kotel komplet, tepelné čerpadlo

interface LLMClassification {
  items: Array<{
    index: number
    name: string
    materialCategory: MaterialCategory
    covered: boolean
    suggestedPayer: 'pojistovna' | 'klient'
    reason: string
  }>
}

// ─── PROMPT ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: CoverageRuleContext): string {
  const partnerName = ctx.partnerCode === 'EUROP' ? 'Europ Assistance'
    : ctx.partnerCode === 'AXA' ? 'AXA Assistance'
    : ctx.partnerCode === 'ALLIANZ' ? 'Allianz / Security Support'
    : ctx.partnerCode

  // Build coverage info section from InsuranceDetails
  const cov = ctx.insuranceCoverage
  let coverageSection = ''
  if (cov) {
    const dmStatus = cov.dm ?? 'not_covered'
    const ndStatus = cov.nd ?? 'not_covered'
    const mStatus = cov.m ?? 'not_covered'
    const allNotCovered = ['not_covered', 'false', 'none', ''].includes(dmStatus.toLowerCase())
      && ['not_covered', 'false', 'none', ''].includes(ndStatus.toLowerCase())
      && ['not_covered', 'false', 'none', ''].includes(mStatus.toLowerCase())
    coverageSection = allNotCovered
      ? `
POISTNÉ KRYTIE MATERIÁLU: ŽIADNY materiál nie je krytý poisťovňou.
Poisťovňa hradí len prácu a cestovné. VŠETKY materiálové položky hradí KLIENT.
Nastav suggestedPayer na "klient" pre KAŽDÚ položku.`
      : `
POISTNÉ KRYTIE MATERIÁLU PRE TÚTO ZÁKAZKU (ROZHODUJÚCE!):
- Drobný materiál (DM): ${dmStatus}
- Náhradné diely (ND): ${ndStatus}
- Materiál (M): ${mStatus}

PRAVIDLO: Ak je typ materiálu "not_covered" alebo chýba, VŠETKY položky toho typu hradí KLIENT.
Ak je "included" alebo "excluded" s limitom, poisťovňa hradí do limitu.
Toto je NAJDÔLEŽITEJŠIE pravidlo — vždy rozhoduje poistné krytie konkrétnej zákazky.`
  } else {
    coverageSection = `
POISTNÉ KRYTIE: Informácie o krytí materiálu NIE SÚ dostupné.
BEZ INFORMÁCIE O KRYTÍ nastav suggestedPayer na "klient" pre VŠETKY materiály.
Ak nevieme čo poisťovňa kryje, je bezpečnejšie účtovať klientovi — operátor to môže prepísať.`
  }

  return `Jsi expert na klasifikáciu materiálov pre havarijné poistenie domácností.
Poisťovňa: ${partnerName}
Kategória zákazky: ${ctx.category}
${ctx.isNeglectedMaintenance ? 'POZOR: Zákazka bola označená ako zanedbaná údržba — poisťovňa hradí len výjezd a diagnostiku.' : ''}
${ctx.coverageExclusionText ? `Text výluk z poistného krytia: "${ctx.coverageExclusionText}"` : ''}
${coverageSection}

KLASIFIKUJ každú položku materiálu do jednej z týchto kategórií:

1. **drobny_material** — Drobný spotrebný materiál: matice, šrouby, těsnění, silikón, montážní pěna, teflon, pásky, konopí, hmoždinky, káble do 5m, klince, tmel.
   → Poisťovňa hradí DM len ak je v poistnom krytí "included" alebo "excluded" s limitom.
   → Ak je DM "not_covered" → všetky DM položky hradí klient.

2. **nahradny_diel** — Náhradný diel / opravný komponent: sifón, ventil, baterie (vodovodná), termostat, čerpadlo, řídicí deska, hadice, flexi přípojka, tvarovka, koleno, redukce, odpad, přepad, vložka zámku, cylindr, zásuvka, vypínač, čerpadlo do pračky.
   → Poisťovňa hradí ND len ak je v poistnom krytí "included" alebo "excluded" s limitom.
   → Ak je ND "not_covered" → všetky ND položky hradí klient.
   → Prémiové značky batérií (Grohe, Hansgrohe, Ideal Standard, Kludi, Hansa, Roca, Duravit) — rozdiel hradí klient.
   → Bezpečnostní vložky (Mul-T-Lock, Abloy, EVVA, Fichet, KESO) — klient. Štandard FAB → pojistovna.
   → U kotlov/bojlerov: diely VNÚTRI zariadenia (termostat, deska, čerpadlo, výměník) sú ND. Diely VONKU (expanzná nádoba, komín, vonkajšie čidlo) hradí klient.

3. **cely_spotrebic** — Celý spotrebič ako kompletná jednotka: pračka, lednice, sporák, myčka, mikrovlnka, sušička, mrazák.
   → Pojistovna NEHRADÍ výmenu celého spotrebiča. Vždy klient.

4. **cela_sanita** — Celé sanitární zařízení: umývadlo, toaleta/klozet/WC mísa, vana, sprchový kout, sprchová vanička, bidet, dřez.
   → Pojistovna NEHRADÍ výmenu celé sanity. Vždy klient.
   → POZOR: "sifón umývadlový" alebo "baterie dřezová" NIE JE celá sanita! To je náhradný diel PRE sanitu.
   → POZOR: "těsnění pod umývadlo" alebo "ventil na dřez" tiež NIE JE celá sanita — je to diel montovaný K zariadeniu.

5. **osvetleni** — Svítidla a žárovky: svítidlo, lustr, žárovka, zářivka, LED panel.
   → Pojistovna NEHRADÍ svítidla ani žárovky. Klient.

6. **cele_zariadeni** — Celé technické zariadenie: nový bojler, nový kotel, tepelné čerpadlo komplet, celá digestoř, celá trouba.
   → Pojistovna NEHRADÍ výmenu celého zariadenia. Klient.
   → POZOR: "termostat bojleru", "řídicí deska kotle", "čerpadlo kotle" sú NÁHRADNÉ DIELY, nie celé zariadenie!

KĽÚČOVÉ PRAVIDLO — rozlišuj:
- "umývadlový sifón" = **nahradny_diel** (sifón pre umývadlo, nie samotné umývadlo)
- "umývadlo 60cm" = **cela_sanita** (celé umývadlo)
- "bojlerový termostat" = **nahradny_diel** (diel vnútri bojlera)
- "nový bojler 80L" = **cele_zariadeni** (celý bojler)
- "vanová baterie" = **nahradny_diel** (batéria pre vanu, nie samotná vana)
- "vana akrylátová 170cm" = **cela_sanita** (celá vana)
- "PPR spojka" = **nahradny_diel** (inštalatérsky diel)
- "Cu fitinky + pájka" = **nahradny_diel** (inštalatérsky materiál)

Vrať JSON vo formáte:
{
  "items": [
    {
      "index": 0,
      "name": "názov položky",
      "materialCategory": "nahradny_diel",
      "covered": true,
      "suggestedPayer": "pojistovna",
      "reason": "Štandardný náhradný diel — poisťovňa hradí (ND je v krytí)."
    }
  ]
}

Reason píš v slovenčine/češtine, stručne (1 veta). VŽDY uveď či daný typ materiálu je/nie je v poistnom krytí.`
}

function buildUserMessage(items: MaterialItem[]): string {
  const lines = items.map((item, idx) =>
    `${idx}. "${item.name}" (typ: ${item.type || 'neuvedený'}, ${item.quantity}× po ${item.pricePerUnit} Kč)`
  )
  return `Klasifikuj tieto materiály:\n${lines.join('\n')}`
}

// ─── LLM CLASSIFICATION ────────────────────────────────────────────────────

export async function classifyMaterials(
  items: MaterialItem[],
  ctx: CoverageRuleContext,
): Promise<MaterialListResult> {
  if (items.length === 0) {
    return { verdicts: [], reassignedToKlient: 0, totalClientCost: 0, messages: [] }
  }

  // Try LLM classification first
  try {
    const raw = await chatCompletion({
      systemPrompt: buildSystemPrompt(ctx),
      userMessage: buildUserMessage(items),
      model: TIER_A_MODEL,
      provider: TIER_A_PROVIDER,
      maxTokens: 200 * items.length,
      temperature: 0.1,
      jsonMode: true,
      reasoning: 'none',
    })

    const parsed = parseLLMJson<LLMClassification>(raw)
    if (parsed?.items && parsed.items.length === items.length) {
      return convertToMaterialListResult(parsed, items)
    }

    console.warn('[MaterialClassifier] LLM returned invalid structure, falling back to rules')
  } catch (err) {
    console.error('[MaterialClassifier] LLM classification failed:', (err as Error).message)
  }

  // Fallback: rule-based system
  return evaluateRuleBased(items, ctx)
}

// ─── TYPE MAPPING ───────────────────────────────────────────────────────────

/** Map LLM 6-category classification → 4 MaterialType values for pricing buckets */
function llmCategoryToMaterialType(cat: MaterialCategory): MaterialType {
  switch (cat) {
    case 'drobny_material': return 'drobny_material'
    case 'nahradny_diel':   return 'nahradny_diel'
    // Celé spotrebiče/sanita/osvetlenie/zariadenia → nahradny_diel (payer=klient)
    case 'cely_spotrebic':  return 'nahradny_diel'
    case 'cela_sanita':     return 'nahradny_diel'
    case 'osvetleni':       return 'nahradny_diel'
    case 'cele_zariadeni':  return 'nahradny_diel'
    default:                return 'material'
  }
}

// ─── CONVERSION ─────────────────────────────────────────────────────────────

function convertToMaterialListResult(
  classification: LLMClassification,
  items: MaterialItem[],
): MaterialListResult {
  const verdicts: CoverageVerdict[] = []
  let reassignedToKlient = 0
  let totalClientCost = 0
  const messageSet = new Set<string>()

  for (const classified of classification.items) {
    const item = items[classified.index]
    if (!item) continue

    const verdict: CoverageVerdict = {
      itemId: item.id ?? String(classified.index),
      itemName: classified.name || item.name,
      covered: classified.covered,
      suggestedPayer: classified.suggestedPayer,
      suggestedType: llmCategoryToMaterialType(classified.materialCategory),
      reason: classified.reason,
      ruleId: `llm_${classified.materialCategory}`,
    }
    verdicts.push(verdict)

    if (!classified.covered || classified.suggestedPayer === 'klient') {
      reassignedToKlient++
      totalClientCost += item.quantity * item.pricePerUnit
      if (classified.reason) messageSet.add(classified.reason)
    }
  }

  return {
    verdicts,
    reassignedToKlient,
    totalClientCost,
    messages: Array.from(messageSet),
  }
}
