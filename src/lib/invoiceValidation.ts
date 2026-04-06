/**
 * Invoice amount validation for payment batch flow.
 *
 * Strict validation: uploaded invoice grandTotal must match
 * settlement paymentFromZR within ±1 Kč tolerance.
 */

export interface InvoiceValidationResult {
  valid: boolean
  diff: number
  invoiceAmount: number
  expectedAmount: number
  message?: string
}

/** Default tolerance in CZK (same as bank payment matching) */
const AMOUNT_TOLERANCE = 1.0

/**
 * Validate that invoice amount matches settlement payment.
 *
 * For system_generated invoices, amounts come from pricing engine
 * so they always match → auto-validated.
 *
 * For self_issued (uploaded), compare grandTotal vs paymentFromZR.
 */
export function validateInvoiceAmount(
  invoiceGrandTotal: number,
  settlementPaymentFromZR: number,
  tolerance: number = AMOUNT_TOLERANCE
): InvoiceValidationResult {
  // Sanity check: values above 1 000 000 Kč are likely a haléře/CZK unit mismatch
  if (invoiceGrandTotal > 1_000_000 || settlementPaymentFromZR > 1_000_000) {
    console.warn('[INVOICE VALIDATION] Suspiciously large amount — possible haléře/CZK mismatch',
      { invoiceGrandTotal, settlementPaymentFromZR })
  }

  const diff = Math.abs(invoiceGrandTotal - settlementPaymentFromZR)

  if (diff <= tolerance) {
    return { valid: true, diff, invoiceAmount: invoiceGrandTotal, expectedAmount: settlementPaymentFromZR }
  }

  return {
    valid: false,
    diff,
    invoiceAmount: invoiceGrandTotal,
    expectedAmount: settlementPaymentFromZR,
    message: `Částka na faktuře (${invoiceGrandTotal.toFixed(2)} Kč) nesouhlasí s vyúčtováním (${settlementPaymentFromZR.toFixed(2)} Kč). Rozdíl: ${diff.toFixed(2)} Kč.`
  }
}

/**
 * Get the expected payment amount from settlement data.
 * Returns grandTotal for invoices without surcharge,
 * or paymentFromZR for invoices with surcharge split.
 */
export function getExpectedPaymentAmount(
  settlementData: Record<string, unknown> | null,
  invoiceGrandTotal: number
): number {
  if (!settlementData) return invoiceGrandTotal

  // If there's a payment breakdown with paymentFromZR, use that
  // (it represents what ZR pays, excluding client surcharge)
  const paymentFromZR = (settlementData as { paymentFromZR?: number }).paymentFromZR
  if (paymentFromZR && paymentFromZR > 0) {
    return paymentFromZR
  }

  return invoiceGrandTotal
}

export interface ExtractedInvoiceValidationResult {
  valid: boolean
  issues: Array<{
    field: string
    severity: 'error' | 'warning'
    message: string
  }>
}

/**
 * Validate AI-extracted invoice data against technician profile and settlement.
 * Returns validation result with detailed issues list.
 *
 * Errors block auto-validation (invoice_status → 'review_needed').
 * Warnings are informational only.
 */
export function validateExtractedInvoice(params: {
  extracted: {
    invoiceNumber?: string | null
    variabilniSymbol?: string | null
    grandTotal?: number | null
    subtotal?: number | null
    vatAmount?: number | null
    vatRate?: number | null
    supplierIco?: string | null
    supplierDic?: string | null
    supplierIban?: string | null
    supplierBankAccount?: string | null
    dueDate?: string | null
    issueDate?: string | null
    taxableDate?: string | null
    confidence?: number
  }
  technician?: {
    ico?: string | null
    dic?: string | null
    iban?: string | null
    platca_dph?: boolean
    bank_account_number?: string | null
  } | null
  settlementPaymentFromZR?: number | null
  amountTolerance?: number
}): ExtractedInvoiceValidationResult {
  const { extracted, technician, settlementPaymentFromZR, amountTolerance = AMOUNT_TOLERANCE } = params
  const issues: ExtractedInvoiceValidationResult['issues'] = []

  // 1. Required fields check (error)
  if (!extracted.invoiceNumber) {
    issues.push({ field: 'invoiceNumber', severity: 'error', message: 'Číslo faktury chybí' })
  }
  if (extracted.grandTotal == null) {
    issues.push({ field: 'grandTotal', severity: 'error', message: 'Celková částka faktury chybí' })
  }
  if (!extracted.dueDate) {
    issues.push({ field: 'dueDate', severity: 'error', message: 'Datum splatnosti chybí' })
  }

  // 2. Amount validation (error)
  if (settlementPaymentFromZR != null && extracted.grandTotal != null) {
    const amountResult = validateInvoiceAmount(extracted.grandTotal, settlementPaymentFromZR, amountTolerance)
    if (!amountResult.valid) {
      issues.push({
        field: 'grandTotal',
        severity: 'error',
        message: amountResult.message ?? `Částka na faktuře nesouhlasí s vyúčtováním. Rozdíl: ${amountResult.diff.toFixed(2)} Kč.`,
      })
    }
  }

  // 3. IČO cross-check (warning)
  if (extracted.supplierIco && technician?.ico) {
    if (extracted.supplierIco.trim() !== technician.ico.trim()) {
      issues.push({
        field: 'supplierIco',
        severity: 'warning',
        message: 'IČO na faktuře nesouhlasí s profilem technika',
      })
    }
  }

  // 4. IBAN cross-check (warning)
  if (extracted.supplierIban && technician?.iban) {
    const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase()
    if (normalize(extracted.supplierIban) !== normalize(technician.iban)) {
      issues.push({
        field: 'supplierIban',
        severity: 'warning',
        message: 'IBAN na faktuře nesouhlasí s profilem technika',
      })
    }
  }

  // 5. DPH consistency (warning)
  if (technician?.platca_dph === false && extracted.vatRate != null && extracted.vatRate > 0) {
    issues.push({
      field: 'vatRate',
      severity: 'warning',
      message: 'Technik není plátce DPH, ale faktura obsahuje DPH',
    })
  }

  // 6. Low confidence (warning)
  if (extracted.confidence != null && extracted.confidence < 70) {
    issues.push({
      field: 'confidence',
      severity: 'warning',
      message: 'Nízká spolehlivost AI extrakce',
    })
  }

  // 7. Missing bank info (warning)
  const hasBankInfo = extracted.supplierIban || extracted.supplierBankAccount
  const techHasIban = technician?.iban
  if (!hasBankInfo && !techHasIban) {
    issues.push({
      field: 'supplierIban',
      severity: 'warning',
      message: 'Chybí bankovní spojení pro úhradu',
    })
  }

  const valid = issues.every(i => i.severity !== 'error')
  return { valid, issues }
}
