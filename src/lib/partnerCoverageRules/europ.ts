import type { MaterialItem, CoverageRuleContext, CoverageVerdict, PartnerRules } from './types'
import {
  WHOLE_APPLIANCE_TERMS,
  EXTERNAL_HEATING_PARTS,
  HEATING_CATEGORIES,
  getCategoryCode,
  nameIncludes,
  nameIncludesWholeWord,
  makeVerdict,
} from './sharedRules'

// ---------------------------------------------------------------------------
// EA-specific constants
// ---------------------------------------------------------------------------

const ALLOWED_DM_TERMS = [
  'matice', 'matka', 'šroub', 'šróby', 'šroubek', 'nut', 'screw',
  'konopí', 'konope', 'těsn', 'tesneni', 'těsnění',
  'montážní pěna', 'montážna pena', 'silikón', 'silikon', 'teflon', 'páska',
]

const SECURITY_CYLINDER_TERMS = [
  'bezpečnostní', 'bezpečnostn', 'security',
  'mul-t-lock', 'multlock', 'abloy', 'fichet', 'evva', 'keso',
]

const PREMIUM_FAUCET_TERMS = [
  'grohe', 'hansgrohe', 'ideal standard', 'kludi', 'hansa', 'roca', 'duravit', 'dornbracht',
]

const APPLIANCE_EXCLUSION_TERMS = [
  'sklokeramick', 'varná deska praskl', 'prasklá deska', 'cracked cooktop',
  'osvětlení', 'osvetlenie', 'žárovka digestoř', 'žárovka trouba', 'žárovka lednice',
  'mechanické poškozeni', 'mechanické poškodeni', 'mechanical damage',
]

const FAUCET_TERMS = ['baterie', 'batéria', 'faucet', 'kohout', 'směšovací']

// ---------------------------------------------------------------------------
// Rule functions (each returns CoverageVerdict | null)
// ---------------------------------------------------------------------------

function ruleNeglectedMaintenance(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.isNeglectedMaintenance) return null
  return makeVerdict(
    item,
    false,
    'klient',
    'ea_neglected_maintenance',
    'Pojistná událost způsobena zanedbánou údržbou nebo neoprávněnou úpravou. EA hradí pouze výjezd + diagnostiku.',
  )
}

function ruleDrobnyMaterial(item: MaterialItem, _ctx: CoverageRuleContext): CoverageVerdict | null {
  if (item.type !== 'drobny_material') return null

  if (nameIncludes(item.name, ALLOWED_DM_TERMS)) {
    return makeVerdict(
      item,
      true,
      'pojistovna',
      'ea_dm_allowed',
      'Drobný materiál splňuje podmínky EA (matice, šrouby, těsnicí konopí a montážní pěnu).',
    )
  }

  return makeVerdict(
    item,
    false,
    'klient',
    'ea_dm_not_allowed',
    'EA z drobného materiálu hradí pouze: matice, šrouby, těsnicí konopí a montážní pěnu. Tato položka nesplňuje podmínky.',
  )
}

function ruleWholeApplianceEa(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!nameIncludesWholeWord(item.name, WHOLE_APPLIANCE_TERMS)) return null
  return makeVerdict(
    item,
    false,
    'klient',
    'ea_whole_appliance',
    'EA nehradí celé spotřebiče, svítidla, sanitární ani technická zařízení (umyvadla, toalety, vany, bojlery, kotle). Hradí se pouze díly uvnitř zařízení.',
  )
}

function ruleHeatingDevicePartsEa(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  const catCode = getCategoryCode(ctx.category)
  if (!HEATING_CATEGORIES.includes(catCode)) return null

  if (nameIncludes(item.name, EXTERNAL_HEATING_PARTS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      'ea_external_heating_part',
      'Díly mimo topné zařízení (expanzní nádoba, vnější čidla, komín) EA nehradí. Platí klient.',
    )
  }

  // Internal part of heating device + nahradny_diel → fall through to default (covered)
  if (item.type === 'nahradny_diel') return null

  // Other internal parts also fall through
  return null
}

function ruleLocksmith(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.category.startsWith('14')) return null

  if (nameIncludes(item.name, SECURITY_CYLINDER_TERMS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      'ea_security_cylinder',
      'EA hradí pouze standardní FAB cylindr + 2 klíče. Bezpečnostní cylindr a komponenty hradí klient.',
    )
  }

  // Standard cylinder/insert/key → fall through to default (covered)
  const nameLower = item.name.toLowerCase()
  if (
    nameLower.includes('cylindr') ||
    nameLower.includes('vložka') ||
    nameLower.includes('klíč')
  ) {
    return null
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
      'ea_premium_faucet',
      'EA hradí baterii střední kvality. Rozdíl v ceně prémiové baterie (Grohe, Hansgrohe aj.) + případná doprava hradí klient.',
    )
  }

  // Standard faucet → fall through to default (covered)
  return null
}

function ruleApplianceRepair(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict | null {
  if (!ctx.category.startsWith('11')) return null

  if (nameIncludes(item.name, APPLIANCE_EXCLUSION_TERMS)) {
    return makeVerdict(
      item,
      false,
      'klient',
      'ea_appliance_mechanical',
      'EA nehradí mechanické poškození, prasknuté sklokeramické desky ani osvětlení spotřebičů (digestoř, trouba, lednice).',
    )
  }

  return null
}

function ruleDefault(item: MaterialItem, _ctx: CoverageRuleContext): CoverageVerdict {
  return makeVerdict(
    item,
    true,
    'pojistovna',
    'ea_default_covered',
    'Materiál/díl splňuje podmínky havarijního krytí EA.',
  )
}

// ---------------------------------------------------------------------------
// Main evaluate function
// ---------------------------------------------------------------------------

function evaluate(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict {
  // Category-specific rules run BEFORE generic whole-appliance rule to avoid false positives
  // e.g. "dřezová baterie" (faucet for sink) must not match "dřez" (the sink itself)
  // e.g. "osvětlení digestoře" must be caught by ruleApplianceRepair, not ruleWholeAppliance
  const rules: Array<(item: MaterialItem, ctx: CoverageRuleContext) => CoverageVerdict | null> = [
    ruleNeglectedMaintenance,
    ruleDrobnyMaterial,
    ruleHeatingDevicePartsEa,
    ruleLocksmith,
    ruleFaucetQuality,
    ruleApplianceRepair,
    ruleWholeApplianceEa,
  ]

  for (const rule of rules) {
    const result = rule(item, ctx)
    if (result) return result
  }

  return ruleDefault(item, ctx)
}

export const europRules: PartnerRules = { partnerCode: 'EUROP', evaluate }
export { getCategoryCode }
