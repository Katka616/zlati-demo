import type { MaterialItem, CoverageRuleContext, CoverageVerdict, PartnerRules } from './types'
import { makeVerdict, ruleWholeAppliance, ruleHeatingDeviceParts } from './sharedRules'

// ---------------------------------------------------------------------------
// Rule functions
// ---------------------------------------------------------------------------

function ruleWholeApplianceAllianz(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  return ruleWholeAppliance(item, ctx, 'allianz')
}

function ruleHeatingDevicePartsAllianz(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  return ruleHeatingDeviceParts(item, ctx, 'allianz')
}

function ruleDefault(item: MaterialItem, _ctx: CoverageRuleContext): CoverageVerdict {
  return makeVerdict(
    item,
    true,
    'pojistovna',
    'allianz_default_covered',
    'Materiál/díl splňuje podmínky havarijního krytí Allianz/Security Support.',
  )
}

// ---------------------------------------------------------------------------
// Main evaluate function
// ---------------------------------------------------------------------------

function evaluate(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict {
  const rules: Array<(item: MaterialItem, ctx: CoverageRuleContext) => CoverageVerdict | null> = [
    ruleHeatingDevicePartsAllianz,
    ruleWholeApplianceAllianz,
  ]

  for (const rule of rules) {
    const result = rule(item, ctx)
    if (result) return result
  }

  return ruleDefault(item, ctx)
}

export const allianzRules: PartnerRules = { partnerCode: 'ALLIANZ', evaluate }
