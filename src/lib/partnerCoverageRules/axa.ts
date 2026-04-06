import type { MaterialItem, CoverageRuleContext, CoverageVerdict, PartnerRules } from './types'
import {
  makeVerdict,
  ruleWholeAppliance,
  ruleHeatingDeviceParts,
  nameIncludes,
  nameIncludesWholeWord,
  WHOLE_APPLIANCE_TERMS,
  EXTERNAL_HEATING_PARTS,
  HEATING_CATEGORIES,
  getCategoryCode,
} from './sharedRules'

// ---------------------------------------------------------------------------
// AXA-specific constants — DM pravidlá rovnaké ako EA
// ---------------------------------------------------------------------------

const ALLOWED_DM_TERMS = [
  'matice', 'matka', 'šroub', 'šróby', 'šroubek', 'nut', 'screw',
  'konopí', 'konope', 'těsn', 'tesneni', 'těsnění',
  'montážní pěna', 'montážna pena', 'silikón', 'silikon', 'teflon', 'páska',
  'klince', 'klinec', 'hřebík', 'tmel', 'kabel', 'kábel',
  'hmoždink', 'hmoždenk',
]

const PREMIUM_FAUCET_TERMS = [
  'grohe', 'hansgrohe', 'ideal standard', 'kludi', 'hansa', 'roca', 'duravit', 'dornbracht',
]

const SECURITY_CYLINDER_TERMS = [
  'bezpečnostní', 'bezpečnostn', 'security',
  'mul-t-lock', 'multlock', 'abloy', 'fichet', 'evva', 'keso',
]

const FAUCET_TERMS = ['baterie', 'batéria', 'faucet', 'kohout', 'směšovací']

// ---------------------------------------------------------------------------
// Rule functions
// ---------------------------------------------------------------------------

function ruleNeglectedMaintenance(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.isNeglectedMaintenance) return null
  return makeVerdict(
    item,
    false,
    'klient',
    'axa_neglected_maintenance',
    'Zákazka je zanedbaná údržba — AXA hradí pouze výjezd + diagnostiku.',
  )
}

function ruleDrobnyMaterial(item: MaterialItem, _ctx: CoverageRuleContext): CoverageVerdict | null {
  if (item.type !== 'drobny_material') return null

  if (nameIncludes(item.name, ALLOWED_DM_TERMS)) {
    return makeVerdict(
      item,
      true,
      'pojistovna',
      'axa_dm_allowed',
      'Drobný materiál splňuje podmínky AXA (šrouby, těsnění, konopí, pěna, tmel, klince, kabely).',
    )
  }

  return makeVerdict(
    item,
    false,
    'klient',
    'axa_dm_not_allowed',
    'AXA z drobného materiálu hradí pouze: šrouby, matice, těsnění, konopí, pěnu, tmel, klince, kabely. Tato položka nesplňuje podmínky.',
  )
}

function ruleWholeApplianceAxa(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  return ruleWholeAppliance(item, ctx, 'axa')
}

function ruleHeatingDevicePartsAxa(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  return ruleHeatingDeviceParts(item, ctx, 'axa')
}

function ruleLocksmith(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.category.startsWith('14')) return null

  if (nameIncludes(item.name, SECURITY_CYLINDER_TERMS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      'axa_security_cylinder',
      'AXA hradí pouze standardní FAB cylindr. Bezpečnostní cylindr hradí klient.',
    )
  }

  return null
}

function ruleFaucetQuality(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.category.startsWith('01')) return null

  const isFaucet = nameIncludes(item.name, FAUCET_TERMS)
  if (!isFaucet) return null

  if (nameIncludes(item.name, PREMIUM_FAUCET_TERMS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      'axa_premium_faucet',
      'AXA hradí baterii střední kvality. Rozdíl v ceně prémiové baterie hradí klient.',
    )
  }

  return null
}

function ruleDefault(item: MaterialItem, _ctx: CoverageRuleContext): CoverageVerdict {
  return makeVerdict(
    item,
    true,
    'pojistovna',
    'axa_default_covered',
    'Materiál/díl splňuje podmínky havarijního krytí AXA.',
  )
}

// ---------------------------------------------------------------------------
// Main evaluate function
// ---------------------------------------------------------------------------

function evaluate(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict {
  const rules: Array<(item: MaterialItem, ctx: CoverageRuleContext) => CoverageVerdict | null> = [
    ruleNeglectedMaintenance,
    ruleDrobnyMaterial,
    ruleHeatingDevicePartsAxa,
    ruleLocksmith,
    ruleFaucetQuality,
    ruleWholeApplianceAxa,
  ]

  for (const rule of rules) {
    const result = rule(item, ctx)
    if (result) return result
  }

  return ruleDefault(item, ctx)
}

export const axaRules: PartnerRules = { partnerCode: 'AXA', evaluate }
