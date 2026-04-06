/**
 * Insurance Details Extraction
 * 
 * Converts raw coverage data (totalLimit, materialNote, travelNote, extraCondition)
 * into structured insurance_details for Oracle pricing calculations.
 * 
 * Uses OpenAI to extract structured data from free-text coverage descriptions.
 */

import { chatCompletion } from '@/lib/llm'

export interface InsuranceDetails {
  currency_customer: 'CZK' | 'EUR'
  insurance_coverage: string              // e.g. '7000 czk', '9999999 czk' for unlimited
  insurance_work_hours_per_callout: number // default 99 = unlimited
  insurance_max_callouts: number          // default 99 = unlimited
  insurance_callout: 'included' | 'excluded' | 'not_covered'
  insurance_dm: string                    // drobný materiál: 'included, 7000 czk' | 'excluded' | 'not_covered'
  insurance_nd: string                    // náhradné diely
  insurance_m: string                     // materiál
  insurance_dm_nd: 'True' | 'False'       // kombinácia DM+ND
  insurance_dm_m: 'True' | 'False'        // kombinácia DM+M  
  insurance_nd_m: 'True' | 'False'        // kombinácia ND+M
  insurance_nr_claims: number             // max poistných udalostí, default 99
  insurance_self_retention: string        // spoluúčasť: '0' | '100 eur'
}

export interface CoverageInput {
  totalLimit: number        // in cents (e.g. 700000 = 7000.00)
  materialNote: string      // e.g. 'Hradené do 30,00 CZK v rámci celkového limitu'
  travelNote: string        // e.g. 'Hradené extra mimo celkového limitu'
  extraCondition?: string   // e.g. 'Max 2 hodiny práce, 1 výjazd'
  country?: string          // 'CZ' | 'SK' — determines currency
  rawText?: string          // Raw unstructured coverage description — when set, used AS-IS instead of building from fields above
}

const EXTRACTION_PROMPT = `Extract the following fields from the input description. Output JSON ONLY with these exact keys:
- currency_customer: upper-case currency code for the coverage amounts (e.g., 'CZK', 'EUR'). If unspecified, infer; if impossible, use 'EUR'.
- insurance_coverage: value and currency in the format '[number] [currency_lowercase]' (e.g., '5000 czk', '400 eur'). The currency MUST match currency_customer (lowercase). If coverage is unlimited, use '9999999 [currency_lowercase]'. IMPORTANT: If the text indicates that the CLIENT PAYS for services (phrases like 'hradí klient', 'hradí KLIENT', 'klient uhradí', 'klient zaplatí', 'client pays', 'paid by client'), or if there is NO mention of insurance coverage limits, set this to '0 [currency_lowercase]' (e.g., '0 eur' if currency_customer is EUR, '0 czk' if currency_customer is CZK). Do NOT use client's budget estimates or out-of-pocket amounts as insurance coverage.
- insurance_work_hours_per_callout: integer number of hours of work covered per callout. Use 99 if not specified.
- insurance_max_callouts: integer maximum number of callouts covered. Use 99 if not specified.
- insurance_callout: one of 'included', 'excluded', 'not_covered'. 'included' means part of the insurance_coverage limit; 'excluded' means covered but outside that limit; 'not_covered' means not covered at all.
- insurance_dm: one of 'included'|'excluded'|'not_covered'. This field specifically refers to 'drobny material' (small consumable materials). Use 'included' ONLY if the text explicitly states that drobny material is counted WITHIN or as part of the main coverage limit (e.g., 'práce a materiál do 9000 CZK' means combined). Use 'excluded' if drobny material has its OWN SEPARATE limit that is stated independently from the work limit (e.g., 'práce do 9000 CZK... materiál do 1000 CZK' means two separate limits). Use 'not_covered' if not covered at all. If there is a monetary limit for drobny material, append ', [number] [currency_lowercase]'.
- insurance_nd: one of 'included'|'excluded'|'not_covered'. This field refers to spare parts. Use 'included' ONLY if spare parts are counted WITHIN the main coverage limit. Use 'excluded' if spare parts have their OWN SEPARATE limit stated independently from the work limit. Use 'not_covered' if not covered at all. Spare parts are the highest-granularity material category: if spare parts are covered (e.g., 'included' or 'excluded' with a monetary limit), this implies coverage for both broader 'material' and 'drobny material' unless the text explicitly states otherwise. If there is a monetary limit for spare parts, append ', [number] [currency_lowercase]'.
- insurance_m: one of 'included'|'excluded'|'not_covered'. This field refers to broader 'material' (includes larger materials). Use 'included' ONLY if material is counted WITHIN the main coverage limit. Use 'excluded' if material has its OWN SEPARATE limit stated independently from the work limit. Use 'not_covered' if not covered at all. If there is a monetary limit for material, append ', [number] [currency_lowercase]'.
- insurance_dm_nd: 'True' if 'drobny material' and spare parts are treated as a single package in the policy's meaning; otherwise 'False'.
- insurance_dm_m: 'True' if 'drobny material' and 'material' are treated as a single package; otherwise 'False'.
- insurance_nd_m: 'True' if spare parts and 'material' are treated as a single package; otherwise 'False'.
- Hierarchy and packaging rules:
  1) Spare parts ('insurance_nd') are the top-level material category. If spare parts are covered (included or with a monetary limit), treat both insurance_m and insurance_dm as covered as well, mirroring spare-parts coverage/limits, unless the policy text explicitly contradicts that.
  2) Treat 'material' ('insurance_m') as a superset that includes 'drobny material' ('insurance_dm') (i.e., if the policy mentions 'material' is covered, set both insurance_m and insurance_dm to 'included' unless explicitly stated otherwise).
  3) Do NOT infer 'material' from 'drobny material' alone (i.e., 'drobny material' does not imply full 'material' coverage).
  6) IMPORTANT: When the policy text mentions 'materiál' broadly (e.g., 'materiál do limitu', 'materiál hradený', 'včetně materiálu') WITHOUT specifying only 'drobný materiál', treat ALL material categories as covered: set insurance_nd, insurance_m, AND insurance_dm to 'included'. In Czech/Slovak insurance, 'materiál' is the broadest term covering spare parts, materials, and consumables. Only exclude insurance_nd if the text EXPLICITLY mentions 'bez náhradních dílů', 'náhradní díly nehradíme', or similar explicit spare-parts exclusion.
  4) Packaging flags (insurance_dm_nd, insurance_dm_m, insurance_nd_m) are mutually exclusive: set ONLY one of them to 'True' if the policy indicates a combined-package treatment.
  5) Special rule: if the policy text indicates that insurance_dm, insurance_nd, and insurance_m are ALL covered (e.g., all marked 'included' or have matching monetary sub-limits), then set insurance_nd_m to 'True' (treat spare parts and material as a single package).
- insurance_nr_claims: integer upper limit for number of claims per insurance year; use 99 if not specified.
- insurance_self_retention: self-retention amount as '[number] [currency_lowercase]'. If not specified, return '0'.

CRITICAL: Detecting 'not_covered' material categories:
- If text explicitly says a material category is NOT covered, use phrases like: 'nehradíme', 'nehradí se', 'nehrazené', 'nekryté', 'není kryto', 'nie je kryté', 'not covered', 'bez náhradních dílů', 'bez materiálu'. Set the field to 'not_covered'.
- IMPORTANT: 'drobný materiál' (consumables/small items) is a DIFFERENT category from 'náhradné diely' / 'náhradní díly' (spare parts). If coverage says 'práce a drobný materiál' but does NOT mention spare parts, then: insurance_dm='included', insurance_nd='not_covered', insurance_m='not_covered'. Only 'drobný materiál' is covered — spare parts and broader materials are NOT.
- If coverage says 'náhradní díly nehradíme' or 'bez náhradních dílů', then insurance_nd='not_covered' regardless of other material coverage.
- Do NOT apply the hierarchy rule (spare parts → material → drobny material) when the text explicitly excludes a higher category. Explicit exclusion overrides hierarchy inference.

CRITICAL: Distinguishing 'included' vs 'excluded' for material categories:
- 'included' = counted WITHIN the main coverage limit (combined pot). Examples: 'práce a materiál do 9000 CZK', 'work and material up to 9000', 'včetně materiálu'.
- 'excluded' = covered but with a SEPARATE limit OUTSIDE the main coverage. Examples: 'práce do 9000 CZK... materiál do 1000 CZK' (two separate limits stated), 'work up to 9000... material up to 1000' (separate statements).
- Key indicator: If work and material limits are stated in SEPARATE sentences/clauses with different amounts, they are SEPARATE limits ('excluded'). If stated together with one combined amount, they share the same limit ('included').

Normalization rules:
- NO COVERAGE detection: If the description states that the client pays for all services (look for phrases like 'hradí klient', 'hradí KLIENT', 'klient uhradí', 'službu uhradí klient', or similar in Czech/Slovak), this means there is NO insurance coverage. Set insurance_coverage='0 [currency_lowercase]' (matching the detected currency_customer), insurance_work_hours_per_callout=0, insurance_max_callouts=0, insurance_nr_claims=0, and all coverage fields (insurance_callout, insurance_dm, insurance_nd, insurance_m) to 'not_covered'. Do NOT confuse the client's personal budget or estimated costs with insurance limits.
- Currency detection: map '€' or 'eur' to 'EUR'; 'czk' or 'kč' to 'CZK'. Accept 'euro', 'eurá', 'korun', 'kč', 'czk'; normalize accordingly. currency_customer must be upper-case (e.g., 'CZK'); currencies inside other fields must be lower-case (e.g., 'czk').
- CURRENCY CONSISTENCY: All currency values in all fields (insurance_coverage, insurance_dm, insurance_nd, insurance_m, insurance_self_retention) MUST use the same currency as currency_customer (in lowercase). For example, if currency_customer='EUR', then insurance_coverage must be 'X eur', insurance_dm must be 'included, X eur' or 'excluded, X eur', etc. NEVER mix currencies.
- When an amount is limited 'per callout', reflect only the numeric limit (hours or money) in the appropriate field.
- If text states something is covered but not within the main coverage limit, treat it as 'excluded'.
- Callout classification rules (apply in this PRIORITY order):
  1) If the description mentions callout/transport using any of ['příjezd','prijezd','odjezd','doprava','výjazd','vyjazd','callout'] AND also mentions real costs using any of ['reálné náklady','reálne náklady','reálne naklady','reálnych nákladov','reálnych nakladov','skutočné náklady','skutocne naklady','real costs'], then set insurance_callout='excluded' (covered separately from the work limit).
  2) If the description explicitly states callout/transport is not covered using phrases like ['bez vyjazdu','bez výjazdu','bez dopravy','bez příjezdu','bez odjezdu','callout nehradíme','callout není krytý','callout nie je krytý'], then set insurance_callout='not_covered'.
  3) If the text clearly indicates a single monetary limit that jointly covers callout/transport together with work (e.g., phrasing that implies the same pot/limit covers both), set insurance_callout='included'.
  4) If none of the above applies, infer from context conservatively; do NOT override rule (1) if real costs are present.

Additional formatting rules:
- Remove thousand separators and non-numeric characters from amounts; output plain integers (e.g., '10 000 CZK' -> '10000 czk').

Return ONLY the JSON object, no explanation.`

/**
 * Extract insurance_details from raw coverage data using OpenAI.
 */
export async function extractInsuranceDetails(
  coverage: CoverageInput
): Promise<{ success: true; data: InsuranceDetails } | { success: false; error: string }> {
  // Build description text — use rawText if provided, otherwise construct from fields
  let coverageDescription: string
  if (coverage.rawText) {
    coverageDescription = coverage.rawText
    if (coverage.country) coverageDescription = `Krajina: ${coverage.country}\n${coverageDescription}`
  } else {
    const currency = coverage.country === 'CZ' ? 'CZK' : 'EUR'
    const limitFormatted = coverage.totalLimit > 0
      ? `${new Intl.NumberFormat('cs-CZ').format(coverage.totalLimit)} ${currency}`
      : 'neobmedzené'

    const descriptionParts = [
      `Krajina: ${coverage.country || 'SK'}`,
      `Celkový limit: ${limitFormatted}`,
    ]
    if (coverage.materialNote) descriptionParts.push(`Materiál: ${coverage.materialNote}`)
    if (coverage.travelNote) descriptionParts.push(`Výjazd: ${coverage.travelNote}`)
    if (coverage.extraCondition) descriptionParts.push(`Extra podmienky: ${coverage.extraCondition}`)
    coverageDescription = descriptionParts.join('\n')
  }
  console.log(`[INSURANCE] Extracting details (${coverageDescription.length} chars)`)

  try {
    const outputText = await chatCompletion({
      systemPrompt: 'You are an information extraction engine. Read the insurer coverage description and extract a STRICT, MACHINE-READABLE JSON object. Follow all normalization and defaulting rules exactly. Return ONLY raw JSON, no prose.',
      userMessage: EXTRACTION_PROMPT + '\n\nInput description:\n' + coverageDescription,
      maxTokens: 1000,
    })

    if (!outputText) {
      return { success: false, error: 'empty_response' }
    }

    // Parse JSON (handle potential markdown code blocks)
    let jsonText = outputText
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonText) as InsuranceDetails

    // Validate required fields
    if (!parsed.currency_customer || !parsed.insurance_coverage) {
      console.error('[INSURANCE] Missing required fields:', parsed)
      return { success: false, error: 'missing_required_fields' }
    }

    // Post-validation: CZ country must always use CZK (AI sometimes infers EUR incorrectly)
    if (coverage.country === 'CZ' && parsed.currency_customer === 'EUR') {
      console.warn('[INSURANCE] Auto-correcting currency EUR→CZK for CZ country')
      parsed.currency_customer = 'CZK'
      // Fix all currency suffixes in string fields: 'eur' → 'czk'
      const fixCurrency = (val: string) => val.replace(/\b(\d+)\s*eur\b/gi, '$1 czk')
      parsed.insurance_coverage = fixCurrency(parsed.insurance_coverage)
      if (parsed.insurance_self_retention) parsed.insurance_self_retention = fixCurrency(parsed.insurance_self_retention)
      if (typeof parsed.insurance_dm === 'string') parsed.insurance_dm = fixCurrency(parsed.insurance_dm)
      if (typeof parsed.insurance_nd === 'string') parsed.insurance_nd = fixCurrency(parsed.insurance_nd)
      if (typeof parsed.insurance_m === 'string') parsed.insurance_m = fixCurrency(parsed.insurance_m)
    }

    // Post-validation: detect explicit "not covered" phrases for material categories
    // AI sometimes misclassifies "nehradíme" as "excluded" — override to "not_covered"
    const lowerDesc = coverageDescription.toLowerCase()
    const notCoveredPhrases = ['nehradíme', 'nehradí se', 'nehrazené', 'nekryté', 'není kryto', 'nie je kryté', 'not covered', 'nekryjeme']

    // Spare parts (ND) not covered detection
    const ndNotCoveredPatterns = [
      /náhradn[ií]\s+d[ií]ly\s+nehrad/i,
      /bez\s+náhradn[ií]ch\s+d[ií]l/i,
      /náhradn[ée]\s+diely\s+nehrad/i,
      /spare\s+parts?\s+not\s+covered/i,
      /nd\s+nehrad/i,
    ]
    if (ndNotCoveredPatterns.some(p => p.test(coverageDescription)) && parsed.insurance_nd !== 'not_covered') {
      console.warn('[INSURANCE] Auto-correcting insurance_nd to not_covered (explicit exclusion detected)')
      parsed.insurance_nd = 'not_covered'
    }

    // If coverage mentions ONLY "drobný materiál" (not "materiál" broadly or "náhradní díly"),
    // then ND and M should be not_covered — only DM is covered
    const mentionsDm = /drobn[ýé]\s+materi[aá]l/i.test(coverageDescription)
    const mentionsNdExplicit = /náhradn[ií]\s+d[ií]l/i.test(coverageDescription) || /spare\s+part/i.test(coverageDescription)
    const mentionsMExplicit = /(?<!drobn[ýé]\s)materi[aá]l(?!\s*max)/i.test(coverageDescription) && !mentionsDm
    if (mentionsDm && !mentionsNdExplicit && parsed.insurance_nd !== 'not_covered') {
      // Coverage only mentions "drobný materiál" but AI set ND to something other than not_covered
      // Check if there's no explicit ND coverage mentioned
      if (!/náhradn[ií].*(?:included|kryt|hradí|do\s+\d)/i.test(coverageDescription)) {
        console.warn('[INSURANCE] Auto-correcting insurance_nd to not_covered (only drobny material mentioned)')
        parsed.insurance_nd = 'not_covered'
      }
    }
    if (mentionsDm && !mentionsMExplicit && parsed.insurance_m !== 'not_covered') {
      if (!/materi[aá]l(?!\s*max).*(?:included|kryt|hradí|do\s+\d)/i.test(coverageDescription) || mentionsDm) {
        // Only drobný materiál, not broader material → M = not_covered
        const hasBroadMaterial = /(?:a\s+)?materi[aá]l\s+(?:do|max|včetně)/i.test(coverageDescription) && !/drobn/i.test(coverageDescription.match(/materi[aá]l\s+(?:do|max|včetně)[^,.]*/i)?.[0] || '')
        if (!hasBroadMaterial) {
          console.warn('[INSURANCE] Auto-correcting insurance_m to not_covered (only drobny material mentioned)')
          parsed.insurance_m = 'not_covered'
        }
      }
    }

    // ── Hierarchy enforcement ─────────────────────────────────────────────
    const isCovered = (v: string | undefined) => !!v && v !== 'not_covered' && v !== 'False'

    // Rule: "materiál" broadly → all material categories covered (unless ND explicitly excluded)
    // When insurance_m is covered and coverage text uses broad "materiál" (not just "drobný materiál"),
    // also upgrade insurance_nd unless there's an explicit spare parts exclusion in the text.
    if (isCovered(parsed.insurance_m)) {
      const hasExplicitNdExclusion = /(?:bez|nehrad[ií](?:me)?|nekryt)\s*n[áa]hradn[ií]ch?\s+d[ií]l/i.test(coverageDescription)
        || /n[áa]hradn[ií]\s+d[ií]ly?\s+nehrad/i.test(coverageDescription)
      if (!isCovered(parsed.insurance_nd) && !hasExplicitNdExclusion) {
        console.warn('[INSURANCE] Hierarchy fix: insurance_nd upgraded to match insurance_m (broad "materiál")')
        parsed.insurance_nd = parsed.insurance_m
      }
      if (!isCovered(parsed.insurance_dm)) {
        console.warn('[INSURANCE] Hierarchy fix: insurance_dm upgraded to match insurance_m')
        parsed.insurance_dm = parsed.insurance_m
      }
    }
    // Rule: insurance_nd ⊃ insurance_m ⊃ insurance_dm (spare parts is top-level)
    if (isCovered(parsed.insurance_nd)) {
      if (!isCovered(parsed.insurance_m)) {
        console.warn('[INSURANCE] Hierarchy fix: insurance_m upgraded to match insurance_nd')
        parsed.insurance_m = parsed.insurance_nd
      }
      if (!isCovered(parsed.insurance_dm)) {
        console.warn('[INSURANCE] Hierarchy fix: insurance_dm upgraded to match insurance_nd')
        parsed.insurance_dm = parsed.insurance_nd
      }
    }

    console.log('[INSURANCE] Extracted:', JSON.stringify(parsed))
    return { success: true, data: parsed }

  } catch (err) {
    console.error('[INSURANCE] Extraction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'unknown_error' }
  }
}

/**
 * Check if coverage fields have changed between old and new data.
 */
export function hasCoverageChanged(
  oldCoverage: Partial<CoverageInput> | undefined,
  newCoverage: Partial<CoverageInput> | undefined
): boolean {
  if (!oldCoverage && !newCoverage) return false
  if (!oldCoverage || !newCoverage) return true

  return (
    oldCoverage.totalLimit !== newCoverage.totalLimit ||
    oldCoverage.materialNote !== newCoverage.materialNote ||
    oldCoverage.travelNote !== newCoverage.travelNote ||
    oldCoverage.extraCondition !== newCoverage.extraCondition
  )
}

/**
 * Generate human-readable summary from insurance_details (Slovak).
 */
export function formatInsuranceDetailsSummary(details: InsuranceDetails): string {
  const parts: string[] = []

  // Main coverage
  if (details.insurance_coverage.startsWith('0 ')) {
    parts.push('ŽIADNE POISTNÉ KRYTIE - klient platí všetky náklady')
  } else {
    parts.push(`Limit hlavného krytia: ${details.insurance_coverage}`)
  }

  // Work hours (skip if 99 = unlimited)
  if (details.insurance_work_hours_per_callout && details.insurance_work_hours_per_callout !== 99) {
    parts.push(`Max. hodín práce na výjazd: ${details.insurance_work_hours_per_callout} h`)
  }

  // Max callouts/claims
  const maxCalls = details.insurance_max_callouts !== 99 
    ? details.insurance_max_callouts 
    : (details.insurance_nr_claims !== 99 ? details.insurance_nr_claims : null)
  if (maxCalls) {
    parts.push(`Max. poistných udalostí/rok: ${maxCalls}`)
  }

  // Callout coverage
  const calloutMap: Record<string, string> = {
    included: 'Výjazd: v limite hlavného krytia',
    excluded: 'Výjazd: reálne náklady mimo limit',
    not_covered: 'Výjazd: nekryté',
  }
  parts.push(calloutMap[details.insurance_callout] || `Výjazd: ${details.insurance_callout}`)

  // Material types
  const formatMaterial = (name: string, value: string): string => {
    const lower = value.toLowerCase()
    if (lower === 'not_covered' || lower.includes('nekryt')) return `${name}: nekryté`
    if (lower.startsWith('included')) return `${name}: v limite hlavného krytia`
    if (lower.startsWith('excluded')) {
      const amount = value.split(',')[1]?.trim()
      return amount ? `${name}: mimo limit (${amount})` : `${name}: mimo limit`
    }
    return `${name}: ${value}`
  }

  parts.push(formatMaterial('Drobný materiál', details.insurance_dm))
  parts.push(formatMaterial('Náhradné diely', details.insurance_nd))
  parts.push(formatMaterial('Materiál', details.insurance_m))

  // Self-retention (only if > 0)
  if (details.insurance_self_retention && details.insurance_self_retention !== '0') {
    const sr = details.insurance_self_retention.toLowerCase()
    if (!sr.startsWith('0 ')) {
      parts.push(`Spoluúčasť: ${details.insurance_self_retention}`)
    }
  }

  return parts.join('\n')
}
