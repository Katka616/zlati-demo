/**
 * isdocExport.ts — ISDOC 6.0.1 XML generator for Premier accounting.
 *
 * ISDOC = Information System Document — Czech national standard for e-invoices.
 * Premier, Pohoda, Money S3, ABRA, FlexiBee all support native ISDOC import.
 *
 * Used to generate ISDOC XML from InvoiceData (stored in custom_fields.invoice_data).
 * Batch export packages all invoices from a payment batch into a single ZIP.
 */

import type { InvoiceData, InvoiceLineItem } from '@/types/dispatch'
import { randomBytes } from 'crypto'

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

/** Format number with exactly 2 decimal places */
function fmtAmt(n: number): string {
  return n.toFixed(2)
}

/** Generate a UUID v4 */
function generateUuid(): string {
  // crypto.randomUUID() is available in Node.js 19+ and modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: cryptographically secure UUID v4 via Node.js randomBytes
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Map Czech unit abbreviations to UN/ECE Recommendation 20 codes.
 * Required by ISDOC for InvoicedQuantity/@unitCode.
 */
function mapUnitCode(unit: string): string {
  switch (unit.toLowerCase()) {
    case 'hod':
    case 'hodina':
    case 'hodiny':
      return 'HUR'   // Hour
    case 'km':
    case 'kilometer':
      return 'KMT'   // Kilometre
    case 'ks':
    case 'kus':
    case 'kusy':
      return 'C62'   // One (piece/unit)
    default:
      return 'C62'
  }
}

// ---------------------------------------------------------------------------
// Tax grouping
// ---------------------------------------------------------------------------

interface TaxGroup {
  vatRate: number
  taxableAmount: number
  taxAmount: number
}

/** Group invoice line items by VAT rate, summing base and tax amounts. */
function groupByVatRate(items: InvoiceLineItem[]): TaxGroup[] {
  const groups = new Map<number, { taxableAmount: number; taxAmount: number }>()

  for (const item of items) {
    const existing = groups.get(item.vatRate) || { taxableAmount: 0, taxAmount: 0 }
    existing.taxableAmount += item.totalWithoutVat
    existing.taxAmount += item.vatAmount
    groups.set(item.vatRate, existing)
  }

  const result: TaxGroup[] = []
  groups.forEach((v, rate) => {
    result.push({ vatRate: rate, taxableAmount: v.taxableAmount, taxAmount: v.taxAmount })
  })

  // Sort by rate ascending for deterministic output
  result.sort((a, b) => a.vatRate - b.vatRate)
  return result
}

// ---------------------------------------------------------------------------
// XML building blocks
// ---------------------------------------------------------------------------

function buildPartyIdentification(ico: string | null): string {
  if (!ico) return ''
  const escaped = escXml(ico)
  return `      <PartyIdentification>
        <UserID>${escaped}</UserID>
        <CatalogFirmIdentification>${escaped}</CatalogFirmIdentification>
        <ID>${escaped}</ID>
      </PartyIdentification>`
}

function buildPostalAddress(
  street: string | null,
  city: string | null,
  psc: string | null,
  countryCode = 'CZ',
  countryName = 'Ceska republika'
): string {
  const lines: string[] = []
  lines.push('      <PostalAddress>')
  lines.push(`        <StreetName>${escXml(street || '')}</StreetName>`)
  lines.push(`        <CityName>${escXml(city || '')}</CityName>`)
  lines.push(`        <PostalZone>${escXml(psc || '')}</PostalZone>`)
  lines.push('        <Country>')
  lines.push(`          <IdentificationCode>${escXml(countryCode)}</IdentificationCode>`)
  lines.push(`          <Name>${escXml(countryName)}</Name>`)
  lines.push('        </Country>')
  lines.push('      </PostalAddress>')
  return lines.join('\n')
}

function buildPartyTaxScheme(dic: string | null): string {
  if (!dic) return ''
  return `      <PartyTaxScheme>
        <CompanyID>${escXml(dic)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>`
}

function buildSupplierParty(invoice: InvoiceData): string {
  const s = invoice.supplier
  const lines: string[] = []
  lines.push('  <AccountingSupplierParty>')
  lines.push('    <Party>')
  const partyId = buildPartyIdentification(s.ico)
  if (partyId) lines.push(partyId)
  lines.push(`      <PartyName><Name>${escXml(s.billing_name || '')}</Name></PartyName>`)
  lines.push(buildPostalAddress(s.billing_street, s.billing_city, s.billing_psc))
  const taxScheme = buildPartyTaxScheme(s.dic)
  if (taxScheme) lines.push(taxScheme)
  lines.push('    </Party>')
  lines.push('  </AccountingSupplierParty>')
  return lines.join('\n')
}

function buildCustomerParty(invoice: InvoiceData): string {
  const b = invoice.buyer
  const lines: string[] = []
  lines.push('  <AccountingCustomerParty>')
  lines.push('    <Party>')
  const partyId = buildPartyIdentification(b.ico)
  if (partyId) lines.push(partyId)
  lines.push(`      <PartyName><Name>${escXml(b.name)}</Name></PartyName>`)
  lines.push(buildPostalAddress(b.street, b.city, b.psc))
  const taxScheme = buildPartyTaxScheme(b.dic)
  if (taxScheme) lines.push(taxScheme)
  lines.push('    </Party>')
  lines.push('  </AccountingCustomerParty>')
  return lines.join('\n')
}

function buildInvoiceLine(item: InvoiceLineItem, lineNumber: number): string {
  const unitCode = mapUnitCode(item.unit)
  const unitPriceTaxInclusive = item.vatRate > 0
    ? item.unitPrice * (1 + item.vatRate / 100)
    : item.unitPrice

  const lines: string[] = []
  lines.push('    <InvoiceLine>')
  lines.push(`      <ID>${lineNumber}</ID>`)
  lines.push(`      <InvoicedQuantity unitCode="${escXml(unitCode)}">${fmtAmt(item.quantity)}</InvoicedQuantity>`)
  lines.push(`      <LineExtensionAmount>${fmtAmt(item.totalWithoutVat)}</LineExtensionAmount>`)
  lines.push(`      <LineExtensionAmountTaxInclusive>${fmtAmt(item.totalWithVat)}</LineExtensionAmountTaxInclusive>`)
  lines.push(`      <LineExtensionTaxAmount>${fmtAmt(item.vatAmount)}</LineExtensionTaxAmount>`)
  lines.push(`      <UnitPrice>${fmtAmt(item.unitPrice)}</UnitPrice>`)
  lines.push(`      <UnitPriceTaxInclusive>${fmtAmt(unitPriceTaxInclusive)}</UnitPriceTaxInclusive>`)
  lines.push('      <ClassifiedTaxCategory>')
  lines.push(`        <Percent>${fmtAmt(item.vatRate)}</Percent>`)
  lines.push('        <VATCalculationMethod>0</VATCalculationMethod>')
  lines.push('      </ClassifiedTaxCategory>')
  lines.push('      <Item>')
  lines.push(`        <Description>${escXml(item.description)}</Description>`)
  lines.push('      </Item>')
  lines.push('    </InvoiceLine>')
  return lines.join('\n')
}

function buildInvoiceLines(items: InvoiceLineItem[]): string {
  const lines: string[] = []
  lines.push('  <InvoiceLines>')
  items.forEach((item, idx) => {
    lines.push(buildInvoiceLine(item, idx + 1))
  })
  lines.push('  </InvoiceLines>')
  return lines.join('\n')
}

function buildTaxSubTotal(group: TaxGroup, isReverseCharge: boolean): string {
  const taxable = fmtAmt(group.taxableAmount)
  const tax = fmtAmt(group.taxAmount)
  const inclusive = fmtAmt(group.taxableAmount + group.taxAmount)

  const lines: string[] = []
  lines.push('    <TaxSubTotal>')
  lines.push(`      <TaxableAmount>${taxable}</TaxableAmount>`)
  lines.push(`      <TaxAmount>${tax}</TaxAmount>`)
  lines.push(`      <TaxInclusiveAmount>${inclusive}</TaxInclusiveAmount>`)
  lines.push('      <AlreadyClaimedTaxableAmount>0.00</AlreadyClaimedTaxableAmount>')
  lines.push('      <AlreadyClaimedTaxAmount>0.00</AlreadyClaimedTaxAmount>')
  lines.push('      <AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>')
  lines.push(`      <DifferenceTaxableAmount>${taxable}</DifferenceTaxableAmount>`)
  lines.push(`      <DifferenceTaxAmount>${tax}</DifferenceTaxAmount>`)
  lines.push(`      <DifferenceTaxInclusiveAmount>${inclusive}</DifferenceTaxInclusiveAmount>`)
  lines.push('      <TaxCategory>')
  lines.push(`        <Percent>${fmtAmt(group.vatRate)}</Percent>`)
  if (isReverseCharge) {
    lines.push('        <TaxExemptionReasonCode>AE</TaxExemptionReasonCode>')
    lines.push('        <TaxExemptionReason>Reverse charge</TaxExemptionReason>')
  }
  lines.push('      </TaxCategory>')
  lines.push('    </TaxSubTotal>')
  return lines.join('\n')
}

function buildTaxTotal(invoice: InvoiceData): string {
  const isNonVatPayer = invoice.dphRate === 'non_vat_payer'
  if (isNonVatPayer) return ''

  const isReverseCharge = invoice.dphRate === 'reverse_charge'
  const groups = groupByVatRate(invoice.items)
  if (groups.length === 0) return ''

  const lines: string[] = []
  lines.push('  <TaxTotal>')
  for (const group of groups) {
    lines.push(buildTaxSubTotal(group, isReverseCharge))
  }
  lines.push('  </TaxTotal>')
  return lines.join('\n')
}

function buildLegalMonetaryTotal(invoice: InvoiceData): string {
  const lines: string[] = []
  lines.push('  <LegalMonetaryTotal>')
  lines.push(`    <TaxExclusiveAmount>${fmtAmt(invoice.subtotal)}</TaxExclusiveAmount>`)
  lines.push(`    <TaxInclusiveAmount>${fmtAmt(invoice.grandTotal)}</TaxInclusiveAmount>`)
  lines.push('    <AlreadyClaimedTaxExclusiveAmount>0.00</AlreadyClaimedTaxExclusiveAmount>')
  lines.push('    <AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>')
  lines.push(`    <DifferenceTaxExclusiveAmount>${fmtAmt(invoice.subtotal)}</DifferenceTaxExclusiveAmount>`)
  lines.push(`    <DifferenceTaxInclusiveAmount>${fmtAmt(invoice.grandTotal)}</DifferenceTaxInclusiveAmount>`)
  lines.push('    <PayableRoundingAmount>0.00</PayableRoundingAmount>')
  lines.push('    <PaidDepositsAmount>0.00</PaidDepositsAmount>')
  lines.push(`    <PayableAmount>${fmtAmt(invoice.grandTotal)}</PayableAmount>`)
  lines.push('  </LegalMonetaryTotal>')
  return lines.join('\n')
}

function buildPaymentMeans(invoice: InvoiceData): string {
  const s = invoice.supplier
  const bankAccountId = s.bank_account_number && s.bank_code
    ? `${s.bank_account_number}/${s.bank_code}`
    : s.bank_account_number || ''

  const lines: string[] = []
  lines.push('  <PaymentMeans>')
  lines.push('    <Payment>')
  lines.push(`      <PaidAmount>${fmtAmt(invoice.grandTotal)}</PaidAmount>`)
  lines.push('      <PaymentMeansCode>42</PaymentMeansCode>')
  lines.push('      <Details>')
  lines.push(`        <PaymentDueDate>${escXml(invoice.dueDate)}</PaymentDueDate>`)
  if (invoice.variabilniSymbol) {
    lines.push(`        <ID>${escXml(invoice.variabilniSymbol)}</ID>`)
  }
  lines.push('        <BankAccount>')
  if (bankAccountId) {
    lines.push(`          <ID>${escXml(bankAccountId)}</ID>`)
  }
  if (s.iban) {
    lines.push(`          <IBAN>${escXml(s.iban.replace(/\s/g, ''))}</IBAN>`)
  }
  lines.push('        </BankAccount>')
  lines.push('      </Details>')
  lines.push('    </Payment>')
  lines.push('  </PaymentMeans>')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate ISDOC 6.0.1 XML for a single technician invoice.
 *
 * ISDOC = Information System Document — Czech national standard.
 * Premier, Pohoda, Money S3, ABRA, FlexiBee all support import.
 *
 * @param invoice - Full invoice data from custom_fields.invoice_data
 * @returns Valid ISDOC XML string
 */
export function generateIsdocXml(invoice: InvoiceData): string {
  const isVatApplicable = invoice.dphRate !== 'non_vat_payer'
  const isReverseCharge = invoice.dphRate === 'reverse_charge'

  // Build note — technician note + reverse charge notice
  const noteParts: string[] = []
  if (invoice.note) noteParts.push(invoice.note)
  if (invoice.supplier.invoice_note) noteParts.push(invoice.supplier.invoice_note)
  if (isReverseCharge) noteParts.push('Dan odvadi odberatel podle § 92a zakona o DPH.')
  const note = noteParts.join('\n')

  const parts: string[] = []

  // XML header
  parts.push('<?xml version="1.0" encoding="UTF-8"?>')
  parts.push('<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">')

  // Document metadata
  parts.push('  <DocumentType>1</DocumentType>')
  parts.push(`  <ID>${escXml(invoice.invoiceNumber || '')}</ID>`)
  parts.push(`  <UUID>${generateUuid()}</UUID>`)
  parts.push(`  <IssueDate>${escXml(invoice.issueDate)}</IssueDate>`)
  parts.push(`  <TaxPointDate>${escXml(invoice.taxableDate)}</TaxPointDate>`)
  // Evidenční číslo — secondary document reference for Premier
  if (invoice.evidencniCislo) {
    parts.push('  <OrderReference>')
    parts.push(`    <ID>${escXml(invoice.evidencniCislo)}</ID>`)
    parts.push('  </OrderReference>')
  }
  parts.push(`  <VATApplicable>${isVatApplicable}</VATApplicable>`)
  if (note) {
    parts.push(`  <Note>${escXml(note)}</Note>`)
  }

  // Currency — use actual invoice currency (CZK for CZ, EUR for SK)
  const currencyCode = invoice.currency ?? 'CZK'
  parts.push(`  <LocalCurrencyCode>${currencyCode}</LocalCurrencyCode>`)
  parts.push(`  <ForeignCurrencyCode>${currencyCode}</ForeignCurrencyCode>`)
  parts.push('  <CurrRate>1</CurrRate>')
  parts.push('  <RefCurrRate>1</RefCurrRate>')

  // Parties
  parts.push(buildSupplierParty(invoice))
  parts.push(buildCustomerParty(invoice))

  // Invoice lines
  parts.push(buildInvoiceLines(invoice.items))

  // Tax totals (omitted for non-VAT payers)
  const taxTotal = buildTaxTotal(invoice)
  if (taxTotal) {
    parts.push(taxTotal)
  }

  // Monetary totals
  parts.push(buildLegalMonetaryTotal(invoice))

  // Payment
  parts.push(buildPaymentMeans(invoice))

  parts.push('</Invoice>')

  return parts.join('\n')
}

/**
 * Generate ZIP archive containing ISDOC XMLs for all invoices in a batch.
 * Each invoice is a separate XML file inside the ZIP.
 *
 * @param payments - Array of payment rows with invoice_data
 * @returns Buffer containing ZIP file
 */
export async function generateIsdocZip(
  payments: Array<{ invoice_data: InvoiceData; invoice_number?: string | null }>
): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (const payment of payments) {
    const inv = payment.invoice_data
    if (!inv) continue

    const invoiceNumber = payment.invoice_number || inv.invoiceNumber || 'unknown'
    const xml = generateIsdocXml(inv)
    const filename = getIsdocFilename(invoiceNumber)
    zip.file(filename, xml)
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  return buffer
}

/**
 * Get filename for a single ISDOC export.
 * Format: ISDOC_FV-2026-00042.xml
 */
export function getIsdocFilename(invoiceNumber: string): string {
  // Sanitize: remove characters that are problematic in filenames
  const safe = invoiceNumber.replace(/[/\\:*?"<>|]/g, '_')
  return `ISDOC_${safe}.xml`
}

/**
 * Get filename for batch ISDOC ZIP export.
 * Format: ISDOC_PAY-2026-001.zip
 */
export function getIsdocZipFilename(batchId: string): string {
  const safe = batchId.replace(/[/\\:*?"<>|]/g, '_')
  return `ISDOC_${safe}.zip`
}
