/**
 * Custom Material Exclusion Rules — partner-configurable
 *
 * Pravidlá uložené v partners.custom_fields.material_exclusions.
 * Operátor ich konfiguruje cez admin UI v partner detail page.
 */

import type { MaterialItem, CoverageRuleContext, CoverageVerdict } from './types'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CustomExclusionRule {
  id: string
  label: string
  keywords: string[]
  type: 'full_replacement' | 'external_part' | 'custom'
  categories: string[]  // prázdne = všetky kategórie
  active: boolean
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Normalize string pre case-insensitive + diacritics-insensitive matching */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCategoryCode(category: string): string {
  const match = category.match(/^(\d{2})/)
  return match ? match[1] : ''
}

// ─── EVALUATION ───────────────────────────────────────────────────────────────

/**
 * Evaluate a single material item against custom exclusion rules.
 * Returns CoverageVerdict if any rule matches, null otherwise.
 */
export function evaluateCustomRules(
  item: MaterialItem,
  ctx: CoverageRuleContext,
  customRules: CustomExclusionRule[],
): CoverageVerdict | null {
  if (!customRules || customRules.length === 0) return null

  const normalizedName = normalize(item.name)
  const catCode = getCategoryCode(ctx.category)

  for (const rule of customRules) {
    if (!rule.active) continue

    // Category filter — prázdne categories = platí pre všetky
    if (rule.categories.length > 0) {
      const ruleHasMatch = rule.categories.some(c => {
        const ruleCatCode = getCategoryCode(c)
        return ruleCatCode === catCode
      })
      if (!ruleHasMatch) continue
    }

    // Keyword matching — aspoň jedno kľúčové slovo sa musí nachádzať v názve
    const matched = rule.keywords.some(keyword => {
      const normalizedKeyword = normalize(keyword)
      return normalizedName.includes(normalizedKeyword)
    })

    if (matched) {
      const reasonMap: Record<string, string> = {
        full_replacement: `Výmena celého zariadenia — poisťovňa nehradí (${rule.label})`,
        external_part: `Vonkajší diel — poisťovňa nehradí (${rule.label})`,
        custom: `Výnimka poisťovne — ${rule.label}`,
      }

      return {
        itemId: item.id,
        itemName: item.name,
        covered: false,
        suggestedPayer: 'klient',
        ruleId: `custom_${rule.id}`,
        reason: reasonMap[rule.type] ?? rule.label,
      }
    }
  }

  return null
}

// ─── COVERAGE TEXT EXCLUSIONS ─────────────────────────────────────────────

/**
 * Frázy z popisu poistného krytia, ktoré indikujú výluku materiálu.
 * Ak popis krytia obsahuje takúto frázu A názov materiálu matchne
 * niektorý z termínov za frázou, položka sa preradí na klienta.
 *
 * Príklad: "nehradíme výměnu celého zařízení" + item "nový bojler" → klient
 */
const EXCLUSION_PHRASE_PATTERNS: Array<{
  /** Regex pattern pre frázu v texte krytia */
  pattern: RegExp
  /** Kľúčové slová materiálu, ktoré fráza vylučuje (ak prázdne = matchne cez pattern skupinu) */
  materialTerms: string[]
  reason: string
  ruleId: string
}> = [
  {
    pattern: /nehrad[ií](?:me)?\s+v[ýy]m[eě]nu\s+(?:cel[ée]ho\s+)?za[řr][ií]zen[ií]/i,
    materialTerms: [],
    reason: 'Poistné krytie explicitne vylučuje výmenu celého zariadenia.',
    ruleId: 'coverage_no_replacement',
  },
  {
    pattern: /v[ýy]luka:?\s*mechanick[ée]\s+po[šs]koden[ií]/i,
    materialTerms: [],
    reason: 'Poistné krytie explicitne vylučuje mechanické poškodenie.',
    ruleId: 'coverage_no_mechanical',
  },
  {
    pattern: /nehrad[ií](?:me)?\s+(?:cel[ýy]\s+)?(?:bojler|kotel|kotol)/i,
    materialTerms: ['bojler', 'boiler', 'kotel', 'kotol'],
    reason: 'Poistné krytie explicitne vylučuje výmenu bojlera/kotla.',
    ruleId: 'coverage_no_boiler',
  },
  {
    // "nehradíme náhradních dílů" OR "náhradní díly nehradíme" (flexible Czech/Slovak word order)
    pattern: /(?:(?:bez|nehrad[ií](?:me)?|nekryt[ée])\s+n[áa]hradn[ií]ch\s+d[ií]l[ůu]|n[áa]hradn[ií]\s+d[ií]ly\s+nehrad[ií](?:me)?)/i,
    materialTerms: [],
    reason: 'Poistné krytie explicitne vylučuje náhradné diely.',
    ruleId: 'coverage_no_spare_parts',
  },
  {
    // "nehradíme materiálu" OR "materiál nehradíme" OR "materiál a náhradní díly nehradíme"
    pattern: /(?:(?:bez|nehrad[ií](?:me)?)\s+materi[áa]lu|materi[áa]l(?:\s+a\s+n[áa]hradn[ií]\s+d[ií]ly)?\s+nehrad[ií](?:me)?)/i,
    materialTerms: [],
    reason: 'Poistné krytie explicitne vylučuje materiál.',
    ruleId: 'coverage_no_material',
  },
  {
    pattern: /pouze\s+(?:pr[áa]c[ie]|v[ýy]jezd|diagnostik)/i,
    materialTerms: [],
    reason: 'Poistné krytie hradí pouze práci/výjezd — materiál nehradí.',
    ruleId: 'coverage_work_only',
  },
]

/**
 * Skontroluje či materiálová položka nie je vylúčená textom poistného krytia.
 * Text sa posiela cez ctx.coverageExclusionText (extraCondition, materialNote, popis).
 */
export function evaluateCoverageTextExclusion(
  item: MaterialItem,
  ctx: CoverageRuleContext,
): CoverageVerdict | null {
  const text = ctx.coverageExclusionText
  if (!text || text.trim().length < 5) return null

  const normalizedText = normalize(text)
  const normalizedName = normalize(item.name)

  for (const { pattern, materialTerms, reason, ruleId } of EXCLUSION_PHRASE_PATTERNS) {
    if (!pattern.test(text)) continue

    // Ak pattern nemá materialTerms → platí pre VŠETKY materiály (nie DM)
    if (materialTerms.length === 0) {
      // "bez náhradních dílů" platí len pre ND typ, nie DM
      if (ruleId === 'coverage_no_spare_parts' && item.type === 'drobny_material') continue
      if (ruleId === 'coverage_no_material' && item.type === 'drobny_material') continue

      return {
        itemId: item.id,
        itemName: item.name,
        covered: false,
        suggestedPayer: 'klient',
        ruleId,
        reason,
      }
    }

    // Ak má materialTerms → matchne len ak názov položky obsahuje niektorý z nich
    const itemMatches = materialTerms.some(term => normalizedName.includes(normalize(term)))
    if (itemMatches) {
      return {
        itemId: item.id,
        itemName: item.name,
        covered: false,
        suggestedPayer: 'klient',
        ruleId,
        reason,
      }
    }
  }

  return null
}

/**
 * Načíta custom exclusion rules z partner.custom_fields.
 */
export function getCustomExclusionRules(
  partnerCustomFields: Record<string, unknown> | null | undefined,
): CustomExclusionRule[] {
  if (!partnerCustomFields) return []
  const rules = partnerCustomFields.material_exclusions
  if (!Array.isArray(rules)) return []
  return rules.filter((r: unknown): r is CustomExclusionRule => {
    if (!r || typeof r !== 'object') return false
    const obj = r as Record<string, unknown>
    return typeof obj.id === 'string' && Array.isArray(obj.keywords) && obj.keywords.length > 0
  })
}
