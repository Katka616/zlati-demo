export type Payer = 'pojistovna' | 'klient'
export type MaterialType = 'drobny_material' | 'nahradny_diel' | 'material' | 'specialna_polozka'

export interface MaterialItem {
  id?: string
  name: string
  quantity: number
  pricePerUnit: number
  type: MaterialType | string  // may come as empty string from estimate
}

export interface CoverageRuleContext {
  partnerCode: string       // 'EUROP' | 'AXA' | 'ALLIANZ'
  category: string          // e.g. '04. Gas boiler'
  isDiagnostics: boolean
  isNeglectedMaintenance?: boolean
  partnerCustomFields?: Record<string, unknown>  // from partners.custom_fields
  /** Raw text výluk z poistného krytia (extraCondition, materialNote, popis objednávky).
   *  Ak obsahuje frázy ako "nehradíme výmenu zariadenia", "výluka: mechanické poškodenie",
   *  materiál matchujúci tieto frázy sa automaticky prepne na klient. */
  coverageExclusionText?: string
  /** Insurance coverage details for material types — parsed from order email.
   *  These tell the LLM which material buckets are covered by the insurer. */
  insuranceCoverage?: {
    dm?: string    // e.g. 'included', 'not_covered', 'included, 1000 czk'
    nd?: string    // e.g. 'included', 'not_covered', 'excluded, 5000 czk'
    m?: string     // broader material coverage
  }
}

export interface CoverageVerdict {
  itemId?: string
  itemName: string
  covered: boolean
  reason: string            // SK/CZ text for UI
  suggestedPayer: Payer
  suggestedType?: MaterialType  // LLM-classified type for pricing buckets
  ruleId: string            // e.g. 'ea_whole_appliance'
}

export interface MaterialListResult {
  verdicts: CoverageVerdict[]
  reassignedToKlient: number
  totalClientCost: number
  messages: string[]        // deduplicated SK/CZ messages
}

export interface PartnerRules {
  partnerCode: string
  evaluate(item: MaterialItem, ctx: CoverageRuleContext): CoverageVerdict
}

/** Custom exclusion rule (partner-configurable, stored in custom_fields.material_exclusions) */
export interface CustomExclusionRule {
  id: string
  label: string
  keywords: string[]
  type: 'full_replacement' | 'external_part' | 'custom'
  categories: string[]
  active: boolean
}
