/**
 * SEPA XML generator — pain.001.001.03 (ISO 20022 Credit Transfer Initiation)
 *
 * KB-compatible format per "Klientský formát XML SEPA CT v KB" (platnost od 1.5.2021).
 * Used to generate bank payment batch files for technician payments.
 *
 * Key KB rules:
 * - SWIFT character set only (no diacritics)
 * - VS/KS in <Ustrd> as /VS/xxx/KS/0308
 * - ChrgBr = SLEV, SvcLvl = SEPA
 * - BIC required for CdtrAgt (or omit block entirely)
 */

export interface SepaPayment {
  invoiceNumber: string        // FV-2026-00042
  amount: number               // In CZK/EUR (e.g. 8500.00)
  vs: string                   // Variabilni symbol
  ks?: string                  // Konstantni symbol (default: 0308)
  beneficiaryName: string      // Jan Novak
  beneficiaryIban: string      // CZ6508000000009876543210
  beneficiaryBic?: string      // Optional — if missing, CdtrAgt block is omitted
}

export interface SepaDebtor {
  name: string                 // Zlati Remeslnici s.r.o.
  iban: string                 // CZ...
  bic: string                  // KOMBCZPPXXX
  ico: string                  // ICO
  street?: string
  city?: string
  postCode?: string
  country?: string             // CZ
}

export interface SepaBatchInput {
  batchId: string              // PAY-2026-001
  payments: SepaPayment[]
  debtor: SepaDebtor
  requestedExecutionDate: string  // YYYY-MM-DD
  currency?: string            // Default: CZK
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape XML special characters */
function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Truncate to max length */
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s
}

/** Format number with exactly 2 decimal places */
function fmtAmt(n: number): string {
  return n.toFixed(2)
}

/**
 * Current local datetime in ISO format without timezone suffix.
 * KB requires format like 2026-04-01T11:14:24 (no trailing Z).
 */
function isoNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Strip diacritics and non-SWIFT characters.
 * KB accepts only: a-z A-Z 0-9 / - ? : ( ) . , ' + space
 */
function toSwift(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip combining diacritics
    .replace(/[^a-zA-Z0-9 /\-?:().,'+]/g, '')  // keep only SWIFT chars
    .replace(/\s{2,}/g, ' ')          // collapse multiple spaces
    .trim()
}

// ---------------------------------------------------------------------------
// IBAN validation
// ---------------------------------------------------------------------------

/**
 * Validate IBAN using ISO 13616 modulo-97 check.
 * Returns true if the IBAN is structurally valid.
 */
function isValidIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false
  // Move first 4 chars to end, then convert letters A=10…Z=35
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const digits = rearranged.replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55))
  let remainder = ''
  for (const ch of digits) {
    remainder = String(Number(remainder + ch) % 97)
  }
  return Number(remainder) === 1
}

// ---------------------------------------------------------------------------
// XML building
// ---------------------------------------------------------------------------

function buildCdtTrfTxInf(p: SepaPayment, currency: string): string {
  if (!isValidIban(p.beneficiaryIban)) {
    throw new Error(`Invalid IBAN for payment ${p.invoiceNumber}: "${p.beneficiaryIban}"`)
  }

  // KB: VS/KS in <Ustrd> as /VS/xxx/KS/0308 (max 140 chars)
  const ks = p.ks || '0308'
  const remittanceInfo = `/VS/${p.vs}/KS/${ks}`

  // KB: CdtrAgt only if real BIC is provided — NOTPROVIDED is not accepted
  const cdtrAgtBlock = p.beneficiaryBic
    ? `\n        <CdtrAgt>\n          <FinInstnId><BIC>${escXml(p.beneficiaryBic)}</BIC></FinInstnId>\n        </CdtrAgt>`
    : ''

  return `      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escXml(trunc(toSwift(p.invoiceNumber), 35))}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${escXml(currency)}">${fmtAmt(p.amount)}</InstdAmt>
        </Amt>${cdtrAgtBlock}
        <Cdtr>
          <Nm>${escXml(trunc(toSwift(p.beneficiaryName), 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>${escXml(p.beneficiaryIban)}</IBAN></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escXml(trunc(remittanceInfo, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`
}

function buildPostalAddress(d: SepaDebtor): string {
  if (!d.street && !d.city && !d.postCode && !d.country) return ''
  const lines: string[] = []
  lines.push('        <PstlAdr>')
  if (d.street) lines.push(`          <StrtNm>${escXml(toSwift(d.street))}</StrtNm>`)
  if (d.postCode) lines.push(`          <PstCd>${escXml(toSwift(d.postCode))}</PstCd>`)
  if (d.city) lines.push(`          <TwnNm>${escXml(toSwift(d.city))}</TwnNm>`)
  if (d.country) lines.push(`          <Ctry>${escXml(d.country.toUpperCase())}</Ctry>`)
  lines.push('        </PstlAdr>')
  return '\n' + lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate SEPA XML (pain.001.001.03) for a payment batch.
 * Returns valid XML string ready for bank import.
 *
 * @throws Error if payments array is empty
 */
export function generateSepaXml(input: SepaBatchInput): string {
  const { batchId, payments, debtor, requestedExecutionDate } = input
  const currency = input.currency || 'CZK'

  if (!payments || payments.length === 0) {
    throw new Error('Cannot generate SEPA XML: payments array is empty')
  }

  const nbOfTxs = payments.length
  const ctrlSum = fmtAmt(
    payments.reduce((sum, p) => sum + p.amount, 0)
  )
  const dateTag = requestedExecutionDate.replace(/-/g, '')
  const msgId = trunc(`${batchId}-${dateTag}`, 35)

  const txnBlocks = payments.map(p => buildCdtTrfTxInf(p, currency)).join('\n')
  const postalAddr = buildPostalAddress(debtor)

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escXml(msgId)}</MsgId>
      <CreDtTm>${isoNow()}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${escXml(trunc(toSwift(debtor.name), 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escXml(trunc(batchId, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf>
        <InstrPrty>NORM</InstrPrty>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${escXml(requestedExecutionDate)}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escXml(trunc(toSwift(debtor.name), 70))}</Nm>${postalAddr}
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${escXml(debtor.iban)}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BIC>${escXml(debtor.bic)}</BIC></FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${txnBlocks}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}

/**
 * Get default filename for SEPA export.
 * Format: SEPA_PAY-2026-001_20260314.xml
 */
export function getSepaFilename(batchId: string, executionDate: string): string {
  const dateStr = executionDate.replace(/-/g, '')
  return `SEPA_${batchId}_${dateStr}.xml`
}

// ---------------------------------------------------------------------------
// Pre-export validation
// ---------------------------------------------------------------------------

/**
 * Describes a single validation problem found in a payment before SEPA export.
 */
export interface SepaValidationIssue {
  invoiceNumber: string
  beneficiaryName: string
  field: string
  message: string
}

/**
 * Pre-validate payments before SEPA XML generation.
 * Returns list of issues — payments with invalid/missing IBANs, zero amounts, etc.
 * Call this before generateSepaXml() to give operators a clear error report.
 */
export function validateSepaPayments(payments: SepaPayment[]): SepaValidationIssue[] {
  const issues: SepaValidationIssue[] = []

  for (const p of payments) {
    if (!p.beneficiaryIban || p.beneficiaryIban.trim() === '') {
      issues.push({
        invoiceNumber: p.invoiceNumber,
        beneficiaryName: p.beneficiaryName,
        field: 'iban',
        message: 'Chybí IBAN příjemce',
      })
    } else if (!isValidIban(p.beneficiaryIban)) {
      issues.push({
        invoiceNumber: p.invoiceNumber,
        beneficiaryName: p.beneficiaryName,
        field: 'iban',
        message: `Neplatný IBAN: ${p.beneficiaryIban}`,
      })
    }

    if (!p.amount || p.amount <= 0) {
      issues.push({
        invoiceNumber: p.invoiceNumber,
        beneficiaryName: p.beneficiaryName,
        field: 'amount',
        message: 'Nulová nebo záporná částka',
      })
    }

    if (!p.vs || p.vs.trim() === '') {
      issues.push({
        invoiceNumber: p.invoiceNumber,
        beneficiaryName: p.beneficiaryName,
        field: 'vs',
        message: 'Chybí variabilní symbol',
      })
    }

    if (!p.invoiceNumber || p.invoiceNumber.trim() === '') {
      issues.push({
        invoiceNumber: '(unknown)',
        beneficiaryName: p.beneficiaryName,
        field: 'invoiceNumber',
        message: 'Chybí číslo faktury',
      })
    }
  }

  return issues
}
