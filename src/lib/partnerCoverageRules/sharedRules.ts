/**
 * Shared material coverage rule functions — used across multiple partners (AXA, ALLIANZ, EUROP).
 * Extract common rules here to avoid duplication.
 */

import type { MaterialItem, CoverageRuleContext, CoverageVerdict } from './types'

// ─── SHARED CONSTANTS ─────────────────────────────────────────────────────────

/**
 * Terms indicating a whole appliance/fixture being replaced as a unit.
 * Partners generally do not cover whole-unit replacements (only internal parts).
 */
export const WHOLE_APPLIANCE_TERMS = [
  // heating devices as whole units
  'bojler komplet', 'kotel komplet', 'celý kotel', 'celý bojler', 'nový kotel', 'nový bojler',
  'výměna kotle', 'výměna bojleru', 'tepelné čerpadlo komplet',
  // sanitary fixtures — word-boundary + preposition guards prevent false positives:
  //   "sifón umývadlový" → "umývadlo" + letter 'v' → no match (adjective form)
  //   "těsnění pod umývadlo" → "pod" preposition → no match (location descriptor)
  //   "nové umývadlo" → "nové" not a preposition → match (whole fixture) ✓
  'umyvadlo', 'umývadlo', 'toaleta', 'klozet', 'záchod',
  'wc mísa', 'wc mísy', 'wc mísu', 'wc míse', 'wc mísou',
  'vana', 'sprchový kout', 'sprchová vanička',
  'sprchová kabina', 'bidet', 'dřez', 'kuchyňský dřez', 'nerezový dřez',
  // lighting
  'svítidlo', 'svietidlo', 'lustr', 'žárovka', 'žiarovka', 'zářivka',
  // whole appliances
  'pračka', 'práčka', 'myčka', 'umývačka', 'lednice', 'chladnička', 'mrazák', 'mraznička',
  'sušička', 'sporák', 'mikrovlnka',
  // digestoř and trouba as complete units
  'digestoř', 'celá digestoř', 'nová digestoř', 'výměna digestoře',
  'trouba', 'celá trouba', 'nová trouba',
]

/**
 * Parts OUTSIDE a heating device — partners do not cover external installation parts.
 */
export const EXTERNAL_HEATING_PARTS = [
  'expanzní', 'expanzná', 'expansion',
  'vnější čidlo', 'venkovní čidlo', 'vonkajšie čidlo', 'venkovní sensor',
  'vnější potrubí', 'venkovní potrubí', 'vonkajšie potrubie',
  'okapnička', 'odvod kondenzátu venkovní',
  'komínová vložka', 'komín',
  'přívod plynu', 'plynové potrubí mimo',
]

/** Categories that count as heating devices (inside/outside rule applies) */
export const HEATING_CATEGORIES = ['04', '05', '06', '13']

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getCategoryCode(category: string): string {
  const match = category.match(/^(\d{2})/)
  return match ? match[1] : ''
}

/** Czech/Slovak prepositions — when a fixture term follows a preposition, it's a location descriptor, not the item itself.
 *  e.g. "těsnění pod umývadlo" = seal UNDER the washbasin (not the washbasin itself) */
const PREPOSITIONS = new Set([
  'pod', 'na', 'k', 'ke', 'ku', 'z', 'ze', 'zo', 'do', 'od',
  'pro', 'pre', 'pri', 'při', 'v', 've', 'u', 'za', 'nad', 'mezi',
])

/** Simple substring matching — for prefix terms like "sklokeramick", "těsn", "bezpečnostn" */
export function nameIncludes(name: string, terms: string[]): boolean {
  const lower = name.toLowerCase()
  return terms.some(term => lower.includes(term.toLowerCase()))
}

/**
 * Word-boundary-aware matching — ONLY for whole appliance/fixture terms.
 * Guards against false positives:
 * 1. Adjective forms: "umývadlový sifón" does NOT match "umývadlo" (followed by a letter)
 * 2. Prepositional phrases: "těsnění pod umývadlo" does NOT match "umývadlo" (preceded by preposition)
 */
export function nameIncludesWholeWord(name: string, terms: string[]): boolean {
  const lower = name.toLowerCase()
  return terms.some(term => {
    const termLower = term.toLowerCase().trimEnd()
    const idx = lower.indexOf(termLower)
    if (idx === -1) return false
    // Guard 1: if matched text is immediately followed by another letter, it's part of a longer word
    const afterIdx = idx + termLower.length
    // eslint-disable-next-line no-misleading-character-class
    if (afterIdx < lower.length && /[a-záčďéěíňóřšťúůýžäöü]/i.test(lower[afterIdx])) return false
    // Guard 2: if preceded by a Czech/Slovak preposition, it's a location, not the item
    if (idx > 0) {
      const before = lower.substring(0, idx).trimEnd()
      const lastWord = before.split(/\s+/).pop() || ''
      if (PREPOSITIONS.has(lastWord)) return false
    }
    return true
  })
}

export function makeVerdict(
  item: MaterialItem,
  covered: boolean,
  suggestedPayer: 'pojistovna' | 'klient',
  ruleId: string,
  reason: string,
): CoverageVerdict {
  return {
    itemId: item.id,
    itemName: item.name,
    covered,
    suggestedPayer,
    ruleId,
    reason,
  }
}

// ─── SHARED RULES ─────────────────────────────────────────────────────────────

/**
 * Whole appliance replacement rule — partners do not cover full unit replacements.
 * Returns null if the item name does not match any whole-appliance term.
 */
export function ruleWholeAppliance(
  item: MaterialItem,
  _ctx: CoverageRuleContext,
  partnerPrefix: string,
): CoverageVerdict | null {
  if (!nameIncludesWholeWord(item.name, WHOLE_APPLIANCE_TERMS)) return null
  return makeVerdict(
    item,
    false,
    'klient',
    `${partnerPrefix}_whole_appliance`,
    'Nehradí se celé spotřebiče, svítidla, sanitární ani technická zařízení (umyvadla, toalety, vany, bojlery, kotle). Hradí se pouze díly uvnitř zařízení.',
  )
}

/**
 * External heating device parts rule — parts outside the heating unit are not covered.
 * Only applies to heating device categories (04, 05, 06, 13).
 * Returns null if category is not a heating category or item is an internal part.
 */
export function ruleHeatingDeviceParts(
  item: MaterialItem,
  ctx: CoverageRuleContext,
  partnerPrefix: string,
): CoverageVerdict | null {
  const catCode = getCategoryCode(ctx.category)
  if (!HEATING_CATEGORIES.includes(catCode)) return null

  if (nameIncludes(item.name, EXTERNAL_HEATING_PARTS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      `${partnerPrefix}_external_heating_part`,
      'Díly mimo topné zařízení (expanzní nádoba, vnější čidla, komín) pojišťovna nehradí. Platí klient.',
    )
  }

  return null
}
