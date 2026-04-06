/**
 * Protocol form validation — per-type rules.
 *
 * Each protocol type has different required fields and step visibility.
 * This module provides step-level and full-form validation.
 */

import { ProtocolFormData, ProtocolType, PROTOCOL_TYPES } from '@/types/protocol'

export interface ValidationError {
  field: string
  message: string
  step: number
}

/**
 * Validate a specific step for a given protocol type.
 * Returns array of errors (empty = valid).
 */
export function validateStep(
  step: number,
  formData: ProtocolFormData,
  language: 'sk' | 'cz' = 'sk'
): ValidationError[] {
  const errors: ValidationError[] = []
  const t = language === 'sk' ? SK : CZ

  switch (step) {
    case 1: // Case Info + Protocol Type
      if (!formData.protocolType) {
        errors.push({ field: 'protocolType', message: t.selectProtocolType, step: 1 })
      }
      break

    case 2: // Visits
      if (formData.visits.length === 0) {
        errors.push({ field: 'visits', message: t.addVisit, step: 2 })
      }
      formData.visits.forEach((v, i) => {
        if (!v.date) {
          errors.push({ field: `visits[${i}].date`, message: `${t.visit} ${i + 1}: ${t.dateRequired}`, step: 2 })
        }
        if (!v.hours || v.hours < 0.5) {
          errors.push({ field: `visits[${i}].hours`, message: `${t.visit} ${i + 1}: ${t.hoursMinimum}`, step: 2 })
        }
        if (!v.km || v.km < 0.5) {
          errors.push({ field: `visits[${i}].km`, message: `${t.visit} ${i + 1}: ${t.kmMinimum}`, step: 2 })
        }
      })
      break

    case 3: // Work Description + Materials
      if (formData.protocolType === 'diagnostic_only' || formData.protocolType === 'special_diagnostic') {
        if (!formData.diagnosticResult?.trim()) {
          errors.push({ field: 'diagnosticResult', message: t.diagnosticRequired, step: 3 })
        }
      } else {
        if (!formData.workDescription?.trim()) {
          errors.push({ field: 'workDescription', message: t.workDescRequired, step: 3 })
        }
      }

      if (formData.protocolType === 'surcharge' || formData.protocolType === 'completed_surcharge') {
        if (!formData.surchargeAmount?.trim()) {
          errors.push({ field: 'surchargeAmount', message: t.surchargeRequired, step: 3 })
        }
      }

      if (formData.protocolType === 'multi_visit') {
        if (!formData.nextVisitReason?.trim()) {
          errors.push({ field: 'nextVisitReason', message: t.reasonRequired, step: 3 })
        }
      }

      // Material price is required if material name is filled
      formData.spareParts?.forEach((part, i) => {
        if (part.name?.trim() && (!part.price || parseFloat(part.price) <= 0 || part.price.trim() === '')) {
          errors.push({ field: `spareParts[${i}].price`, message: `${t.material} ${i + 1}: ${t.materialPriceRequired}`, step: 3 })
        }
      })
      break

    case 4: // Photos
      // Photos are recommended but not strictly required per protocol type
      // At least 1 photo recommended for non-diagnostic
      if (formData.protocolType !== 'diagnostic_only') {
        if (formData.photos.length === 0) {
          errors.push({ field: 'photos', message: t.photosRecommended, step: 4 })
        }
      }
      break

    case 5: // Checklist
      // Checklist is informational, no hard requirements
      break

    case 6: // Signature
      if (!formData.clientSignature) {
        errors.push({ field: 'clientSignature', message: t.signatureRequired, step: 6 })
      }
      break
  }

  return errors
}

/**
 * Check if a step can proceed (only warnings, no blockers on step 4/5).
 * Returns true if allowed to move forward.
 */
export function canProceed(
  step: number,
  formData: ProtocolFormData,
  language: 'sk' | 'cz' = 'sk'
): { ok: boolean; errors: ValidationError[] } {
  const errors = validateStep(step, formData, language)

  // Step 4 (photos) and step 5 (checklist) are soft — just warnings
  if (step === 4 || step === 5) {
    return { ok: true, errors }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Validate the full form before submission.
 * Checks all visible steps for the selected protocol type.
 */
export function validateFullForm(
  formData: ProtocolFormData,
  language: 'sk' | 'cz' = 'sk'
): ValidationError[] {
  const typeInfo = PROTOCOL_TYPES.find((pt) => pt.id === formData.protocolType)
  const steps = typeInfo?.steps || [1, 2, 3, 4, 5, 6]

  const allErrors: ValidationError[] = []

  for (const step of steps) {
    const stepErrors = validateStep(step, formData, language)
    allErrors.push(...stepErrors)
  }

  return allErrors
}

/**
 * Get the first step with errors (for navigation).
 */
export function getFirstErrorStep(
  formData: ProtocolFormData,
  language: 'sk' | 'cz' = 'sk'
): number | null {
  const errors = validateFullForm(formData, language)
  // Filter out soft warnings (step 4, 5)
  const hardErrors = errors.filter((e) => e.step !== 4 && e.step !== 5)
  return hardErrors.length > 0 ? hardErrors[0].step : null
}

// === Translations ===

const SK = {
  selectProtocolType: 'Vyberte typ protokolu',
  addVisit: 'Pridajte aspoň jeden výjazd',
  visit: 'Výjazd',
  dateRequired: 'Dátum je povinný',
  hoursRequired: 'Zadajte počet hodín',
  hoursMinimum: 'Počet hodín musí byť aspoň 0,5',
  kmMinimum: 'Počet km musí byť aspoň 0,5',
  workDescRequired: 'Vyplňte popis práce',
  diagnosticRequired: 'Vyplňte výsledok diagnostiky',
  surchargeRequired: 'Zadajte sumu doplatku',
  reasonRequired: 'Vyberte dôvod prerušenia práce',
  photosRecommended: 'Odporúčame pridať aspoň 1 fotku',
  signatureRequired: 'Podpis zákazníka je povinný',
  material: 'Materiál',
  materialPriceRequired: 'Zadajte cenu',
}

const CZ = {
  selectProtocolType: 'Vyberte typ protokolu',
  addVisit: 'Přidejte alespoň jeden výjezd',
  visit: 'Výjezd',
  dateRequired: 'Datum je povinné',
  hoursRequired: 'Zadejte počet hodin',
  hoursMinimum: 'Počet hodin musí být alespoň 0,5',
  kmMinimum: 'Počet km musí být alespoň 0,5',
  workDescRequired: 'Vyplňte popis práce',
  diagnosticRequired: 'Vyplňte výsledek diagnostiky',
  surchargeRequired: 'Zadejte částku doplatku',
  reasonRequired: 'Vyberte důvod přerušení práce',
  photosRecommended: 'Doporučujeme přidat alespoň 1 fotku',
  signatureRequired: 'Podpis zákazníka je povinný',
  material: 'Materiál',
  materialPriceRequired: 'Zadejte cenu',
}
