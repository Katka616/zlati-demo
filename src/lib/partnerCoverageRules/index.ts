import type {
  MaterialItem,
  CoverageRuleContext,
  CoverageVerdict,
  MaterialListResult,
  PartnerRules,
} from './types'
import { europRules } from './europ'
import { axaRules } from './axa'
import { allianzRules } from './allianz'
import { evaluateCustomRules, getCustomExclusionRules, evaluateCoverageTextExclusion } from './customRules'

// ---------------------------------------------------------------------------
// Partner registry
// ---------------------------------------------------------------------------

const PARTNER_REGISTRY: Record<string, PartnerRules> = {
  EUROP: europRules,
  AXA: axaRules,
  ALLIANZ: allianzRules,
  // C6: Security Support uses the same rules as Allianz (same company, different branding)
  SEC: allianzRules,
  SECURITY: allianzRules,
}

function getPartnerRules(partnerCode: string): PartnerRules | null {
  return PARTNER_REGISTRY[partnerCode.toUpperCase()] ?? null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate coverage for a single material item.
 * Unknown partners return covered=true with a generic reason.
 * Custom rules from partner.custom_fields.material_exclusions can override hardcoded "covered" verdicts.
 */
export function evaluateMaterialCoverage(
  item: MaterialItem,
  ctx: CoverageRuleContext,
): CoverageVerdict {
  // Špeciálne položky (parkovné, cestovné, požičanie stroja, atď.)
  // sa posudzujú rovnako ako ostatný materiál — podľa krytia poisťovne.
  // Technik/operátor nastaví platcu, coverage rules môžu prehodiť.

  // Insurance coverage check — if the material type bucket is explicitly "not_covered",
  // override to klient regardless of partner rules. This aligns rule-based fallback with LLM behavior.
  if (ctx.insuranceCoverage) {
    const cov = ctx.insuranceCoverage
    const t = (item.type || '').toLowerCase()
    const dmNotCovered = !cov.dm || /not.covered|false|none/i.test(cov.dm)
    const ndNotCovered = !cov.nd || /not.covered|false|none/i.test(cov.nd)
    const mNotCovered  = !cov.m  || /not.covered|false|none/i.test(cov.m)

    if (t === 'drobny_material' && dmNotCovered) {
      return { itemId: item.id, itemName: item.name, covered: false, suggestedPayer: 'klient',
        ruleId: 'insurance_dm_not_covered', reason: 'Drobný materiál není v poistnom krytí.' }
    }
    if (t === 'nahradny_diel' && ndNotCovered) {
      return { itemId: item.id, itemName: item.name, covered: false, suggestedPayer: 'klient',
        ruleId: 'insurance_nd_not_covered', reason: 'Náhradné diely nie sú v poistnom krytí.' }
    }
    if ((t === 'material' || t === 'specialna_polozka') && mNotCovered) {
      return { itemId: item.id, itemName: item.name, covered: false, suggestedPayer: 'klient',
        ruleId: 'insurance_m_not_covered', reason: 'Materiál nie je v poistnom krytí.' }
    }
    // All types not covered → everything to client
    if (dmNotCovered && ndNotCovered && mNotCovered) {
      return { itemId: item.id, itemName: item.name, covered: false, suggestedPayer: 'klient',
        ruleId: 'insurance_all_not_covered', reason: 'Žiadny materiál nie je v poistnom krytí.' }
    }
  }

  const rules = getPartnerRules(ctx.partnerCode)

  if (!rules) {
    // Unknown partner — check custom rules, then coverage text exclusions
    const customRules = getCustomExclusionRules(ctx.partnerCustomFields)
    const customResult = evaluateCustomRules(item, ctx, customRules)
    if (customResult) return customResult
    const textResult = evaluateCoverageTextExclusion(item, ctx)
    if (textResult) return textResult

    return {
      itemId: item.id,
      itemName: item.name,
      covered: true,
      suggestedPayer: 'pojistovna',
      ruleId: 'unknown_partner_default',
      reason: `Partner ${ctx.partnerCode}: pravidla pro materiálové krytí nejsou definována.`,
    }
  }

  const hardcodedResult = rules.evaluate(item, ctx)

  // H11: Custom rules are evaluated for BOTH covered and not-covered hardcoded results.
  // Custom rules can override in either direction (exclude a covered item OR include an excluded one).
  const customRules = getCustomExclusionRules(ctx.partnerCustomFields)
  const customResult = evaluateCustomRules(item, ctx, customRules)
  if (customResult) return customResult

  // Coverage text exclusions only apply when hardcoded says covered (text exclusions can only exclude)
  if (hardcodedResult.covered) {
    const textResult = evaluateCoverageTextExclusion(item, ctx)
    if (textResult) return textResult
  }

  return hardcodedResult
}

/**
 * Evaluate coverage for a list of material items and return a summary.
 */
export function evaluateMaterialList(
  items: MaterialItem[],
  ctx: CoverageRuleContext,
): MaterialListResult {
  const verdicts: CoverageVerdict[] = items.map(item => evaluateMaterialCoverage(item, ctx))

  let reassignedToKlient = 0
  let totalClientCost = 0
  const rawMessages: string[] = []

  for (const verdict of verdicts) {
    if (!verdict.covered || verdict.suggestedPayer === 'klient') {
      reassignedToKlient++
      const item = items.find(i => (i.id !== undefined ? i.id === verdict.itemId : i.name === verdict.itemName))
      if (item) {
        totalClientCost += item.quantity * item.pricePerUnit
      }
      if (!rawMessages.includes(verdict.reason)) {
        rawMessages.push(verdict.reason)
      }
    }
  }

  // Deduplicate messages (already done above via includes check)
  return {
    verdicts,
    reassignedToKlient,
    totalClientCost,
    messages: rawMessages,
  }
}

// Re-export types for convenience
export type {
  MaterialItem,
  CoverageRuleContext,
  CoverageVerdict,
  MaterialListResult,
  PartnerRules,
  Payer,
  MaterialType,
  CustomExclusionRule,
} from './types'
export { getCustomExclusionRules } from './customRules'
