/**
 * Public types for the Diagnostic Brain system.
 *
 * DiagResult is the output of the rule engine + optional LLM enrichment.
 * These types are used across: API routes, admin UI, technician dispatch app.
 */

import type { MaterialCategory } from '@/lib/categorizeMaterials'

/**
 * A single part or material required for a repair scenario.
 * Prices are in whole CZK (not haléře).
 */
export interface DiagPart {
  /** Human-readable name in Czech, e.g. "Kartuša baterie 35mm" */
  name: string
  /** Known compatible brands, e.g. ["Grohe", "Hansgrohe", "Ideal Standard"] */
  brands?: string[]
  /** Category for estimate/invoice classification */
  materialType: MaterialCategory
  /** Default quantity to order */
  qty: number
  /** Unit string, e.g. "ks", "m", "sada" */
  unit: string
  /** Price range in whole CZK — purchase = cost to us, sell = customer price */
  priceCzk: {
    purchase: number
    sell: number
  }
  /** Manufacturer part number or catalog number, if known */
  partNumber?: string
  /** Compatible device models/brands */
  compatibility?: string[]
  /** Suggested payer based on partner coverage rules — set after coverage evaluation */
  suggestedPayer?: 'pojistovna' | 'klient'
  /** Reason why this part is assigned to the suggested payer */
  coverageReason?: string
  /** True for all AI-recommended parts — technician must verify on-site before ordering */
  aiRecommended?: boolean
  /** If true, part is expensive (>= 1000 Kč) and requires technician verification before ordering */
  requiresVerification?: boolean
  /** Basis for this AI recommendation, e.g. "Na základě popisu závady od klienta" */
  recommendationBasis?: string
}

/**
 * A single repair scenario identified by the diagnostic engine.
 * `probability` is set dynamically by the match function (0–100).
 */
export interface RepairScenario {
  /** Unique scenario identifier, e.g. "plumb_dripping_faucet" */
  id: string
  /** 2-digit category code, e.g. "01" = Plumber, "04" = Gas boiler, "05" = Electric boiler */
  category: string
  /** Short title in Czech, e.g. "Kapající kohout" */
  title: string
  /** Match confidence 0–100, set dynamically by the rule engine */
  probability: number
  /** Probable root cause in Czech */
  cause: string
  /** Ordered repair procedure steps in Czech */
  procedure: string[]
  /** Parts needed for this scenario */
  requiredParts: DiagPart[]
  /** Estimated labour hours range */
  estimatedHours: {
    min: number
    max: number
  }
  /** Required technician skill level */
  skillLevel: 'basic' | 'intermediate' | 'advanced'
  /**
   * Likely insurance coverage outcome:
   * - covered: standard havarijní pojištění covers this
   * - likely_covered: usually covered, may need justification
   * - likely_surcharge: likely needs client surcharge (doplatok)
   * - not_covered: typically outside coverage (user damage, old age, etc.)
   */
  insuranceCoverage: 'covered' | 'likely_covered' | 'likely_surcharge' | 'not_covered'
  /** Special warnings for EA odhláška or other insurance-specific notes */
  eaWarnings?: string[]
  /**
   * Partner-specific warnings keyed by partner code (uppercase).
   * e.g. { "AXA": ["AXA: ..."], "SEC": ["SEC: ..."] }
   * Engine populates these based on knowledge base scenarios.
   * `eaWarnings` is legacy — new warnings should use this field.
   */
  partnerWarnings?: Record<string, string[]>
  /** True for scenarios involving gas leaks or electrical hazards — triggers safety UI */
  safetyFlag?: boolean
}

/**
 * Final output of the diagnostic engine for a single job.
 */
export interface DiagResult {
  /** Top-3 scenarios sorted by probability descending */
  scenarios: RepairScenario[]
  /** Deduplicated union of all parts across all top scenarios */
  partsListUnion: DiagPart[]
  /** Rough total cost range in whole CZK (labour + parts) */
  estimatedCostRange: {
    min: number
    max: number
  }
  /** Overall confidence in the diagnosis */
  confidence: 'high' | 'medium' | 'low'
  /** Semantic version of the rule engine used */
  analysisVersion: string
  /** ISO timestamp when this result was generated */
  generatedAt: string
  /** True if the procedure steps were enriched by GPT */
  llmEnriched?: boolean
  /** True if photos were analyzed by GPT-4o vision model */
  visionEnriched?: boolean
  /** 2-digit category code used for knowledge base lookup (e.g. "01", "14") */
  categoryCode?: string
  /**
   * Global disclaimer for the entire diagnostic result.
   * Always set — reminds operator/technician that AI parts list is non-binding.
   */
  disclaimer?: string
  /** Matched error code from the local error code database, if present in DiagData */
  errorCodeMatch?: {
    code: string
    brand?: string
    meaning: string
    severity: 'critical' | 'warning' | 'info'
  }
  /** Vision analysis data from LLM photo analysis (v3.0+ single-call) */
  visionData?: {
    device?: {
      brand?: string
      model?: string
      ageEstimate?: string
    }
    visibleIssues?: string[]
    severity?: 'minor' | 'moderate' | 'severe' | 'emergency'
    technicianNote?: string
  }
}
