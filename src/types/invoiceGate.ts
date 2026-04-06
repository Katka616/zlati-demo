/**
 * Invoice Approval Gate — types shared between API and UI
 * Used at Step 10 (cenová kontrola) to verify all conditions before payment approval
 */

export type InvoiceGateCheckId =
  | 'photos_before'
  | 'photos_after'
  | 'protocols_signed'
  | 'hours_match'
  | 'km_match'
  | 'invoice_amount'

export interface InvoiceGateCheck {
  id: InvoiceGateCheckId
  label: string
  pass: boolean
  /** true = waiting for invoice data, not a hard fail */
  pending?: boolean
  /** Human-readable detail (e.g. "3 fotky" or "Protokol #2 nepodpísaný") */
  detail: string
}

export interface InvoiceGateOverride {
  by: string
  at: string
  reason: string
}

export interface InvoiceGateResult {
  allPass: boolean
  noInvoiceYet: boolean
  override?: InvoiceGateOverride
  checks: InvoiceGateCheck[]
}
