/**
 * Partner Invoice Builder — ZR → insurance partners
 *
 * ZR (Zlatí Řemeslníci s.r.o.) is the SUPPLIER (dodavatel).
 * Insurance partner is the BUYER (odberatel).
 *
 * DPH režim závisí od partnera:
 * - AXA, Security/Allianz → přenos DPH (reverse charge, §92a ZDPH) — 0% na faktúre
 * - Europ Assistance → faktúra priamo klientovi (nie cez partner invoice)
 *
 * Partner flag: custom_fields.reverse_charge = true → přenos DPH
 *
 * Amounts come from PricingResult.insurer.* (whole CZK, bez DPH).
 */

import type { PricingResult } from '@/lib/pricing-engine'
import type { InvoiceLineItem } from '@/types/dispatch'
import { PARTNER_INVOICE_VAT_RATE } from '@/lib/constants'
import { getZrCompanyDetails } from '@/lib/env'

// ZR fixed company data (supplier side of partner invoices)
const ZR_FIXED = {
  name: 'Zlatí Řemeslníci s.r.o.',
  street: 'Školská 660/3',
  city: 'Praha 1 - Nové Město',
  psc: '110 00',
  ico: '22524894',
  dic: 'CZ22524894',
}

export interface PartnerInvoiceData {
  invoiceNumber: string
  variabilniSymbol: string
  issueDate: string         // YYYY-MM-DD
  taxableDate: string       // DUZP (datum uskutečnění zdanitelného plnění)
  dueDate: string           // YYYY-MM-DD (taxableDate + 30 days)
  supplier: {
    name: string
    street: string
    city: string
    psc: string
    ico: string
    dic: string
    iban: string
    bankAccount: string
    bankCode: string
  }
  buyer: {
    name: string
    street: string
    city: string
    psc: string
    ico: string
    dic: string
  }
  reverseCharge: boolean    // true = přenos DPH (§92a), 0% on invoice
  vatRate: number           // 0 for reverse charge, 21 otherwise
  items: InvoiceLineItem[]
  subtotal: number          // bez DPH (suma všetkých riadkov totalWithoutVat)
  vatTotal: number          // DPH celkom (0 for reverse charge)
  grandTotal: number        // s DPH (= subtotal for reverse charge)
  jobReference: string
  jobCategory: string
  partnerClaimNumber: string | null
  note: string
  currency?: string          // 'CZK' (default) or 'EUR' for SK partners
  payBySquareQr?: string     // base64 PNG data URI — QR Platba (SPD)
}

/**
 * Build invoice line items from pricing engine's insurer section.
 * All amounts are in whole CZK (as returned by PricingResult.insurer.*).
 */
export interface SparePartForInvoice {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export function buildPartnerInvoiceLines(
  insurer: PricingResult['insurer'],
  jobCategory: string,
  vatRate: number = PARTNER_INVOICE_VAT_RATE,
  spareParts?: SparePartForInvoice[],
  meta?: PricingResult['meta'],
): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = []
  const rate = vatRate / 100

  // ── Prior technicians info line (multi-tech jobs) ──
  // When previous technicians billed the insurer, show an informational line
  // so the partner sees that part of the coverage was already used.
  if (meta?.multiTech && meta.multiTech.priorInsurerBilling > 0) {
    const currency = insurer.billingCurrency ?? 'CZK'
    items.push({
      description: `Předchozí technici / Predchádzajúci technici — již fakturováno ${meta.multiTech.priorInsurerBilling} ${currency}`,
      quantity: 0,
      unit: 'info',
      unitPrice: 0,
      totalWithoutVat: 0,
      vatRate,
      vatAmount: 0,
      totalWithVat: 0,
    })
  }

  if (insurer.costsWork > 0) {
    const base = insurer.costsWork
    items.push({
      description: `${(jobCategory || 'servisní práce').charAt(0).toUpperCase() + (jobCategory || 'servisní práce').slice(1)} — ${insurer.costsWorkDetails}`,
      quantity: 1,
      unit: 'služba',
      unitPrice: base,
      totalWithoutVat: base,
      vatRate,
      vatAmount: Math.round(base * rate * 100) / 100,
      totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
    })
  }

  if (insurer.costsCallout > 0) {
    const base = insurer.costsCallout
    items.push({
      description: `Výjezd / Doprava (${insurer.costsCalloutDetails})`,
      quantity: 1,
      unit: 'služba',
      unitPrice: base,
      totalWithoutVat: base,
      vatRate,
      vatAmount: Math.round(base * rate * 100) / 100,
      totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
    })
  }

  if (insurer.costsDm > 0) {
    const base = insurer.costsDm
    items.push({
      description: 'Drobný materiál',
      quantity: 1,
      unit: 'komplet',
      unitPrice: base,
      totalWithoutVat: base,
      vatRate,
      vatAmount: Math.round(base * rate * 100) / 100,
      totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
    })
  }

  // Náhradné diely — položkovite ak sú dostupné, inak súhrnne
  if (insurer.costsNdm > 0) {
    if (spareParts && spareParts.length > 0) {
      for (const part of spareParts) {
        const base = part.totalPrice
        if (base > 0) {
          items.push({
            description: `${part.name}${part.quantity > 1 ? ` (${part.quantity} ${part.unit || 'ks'})` : ''}`,
            quantity: part.quantity,
            unit: part.unit || 'ks',
            unitPrice: part.unitPrice,
            totalWithoutVat: base,
            vatRate,
            vatAmount: Math.round(base * rate * 100) / 100,
            totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
          })
        }
      }
    } else {
      const base = insurer.costsNdm
      items.push({
        description: 'Náhradní díly / materiál',
        quantity: 1,
        unit: 'komplet',
        unitPrice: base,
        totalWithoutVat: base,
        vatRate,
        vatAmount: Math.round(base * rate * 100) / 100,
        totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
      })
    }
  }

  if (insurer.costsEmergency > 0) {
    const base = insurer.costsEmergency
    items.push({
      description: 'Pohotovostní příplatek',
      quantity: 1,
      unit: 'služba',
      unitPrice: base,
      totalWithoutVat: base,
      vatRate,
      vatAmount: Math.round(base * rate * 100) / 100,
      totalWithVat: Math.round(base * (1 + rate) * 100) / 100,
    })
  }

  return items
}

/**
 * Build complete partner invoice data from job + pricing result.
 */
export function buildPartnerInvoiceData(params: {
  pricingResult: PricingResult
  invoiceNumber: string
  vs: string
  duzpDate: string
  jobReference: string
  jobCategory: string
  partnerBilling: { name: string; street: string; city: string; psc: string; ico: string; dic: string }
  partnerClaimNumber?: string | null
  reverseCharge?: boolean
  spareParts?: SparePartForInvoice[]
  customNote?: string | null
  config?: {
    bank_iban?: string | null
    bank_account?: string | null
    bank_code?: string | null
    note_template?: string | null
    vat_rate_override?: number | null
    payment_term_days?: number | null
  } | null
}): PartnerInvoiceData {
  const {
    pricingResult,
    invoiceNumber,
    vs,
    duzpDate,
    jobReference,
    jobCategory,
    partnerBilling,
    partnerClaimNumber,
    reverseCharge = false,
    spareParts,
    customNote,
    config,
  } = params

  // Reverse charge: state the applicable rate but vatAmount = 0 (buyer pays)
  // Use engine-derived rate (12% residential CZ, 21% commercial/Keyservice, 23% SK)
  const engineVatRate = pricingResult.meta?.partnerVatRate != null
    ? Math.round(pricingResult.meta.partnerVatRate * 100)
    : PARTNER_INVOICE_VAT_RATE
  const vatRate = reverseCharge ? engineVatRate : engineVatRate

  const items = buildPartnerInvoiceLines(pricingResult.insurer, jobCategory, reverseCharge ? 0 : vatRate, spareParts, pricingResult.meta)
  // For reverse charge: line items have vatAmount=0 but we label them with the applicable rate
  if (reverseCharge) {
    for (const item of items) {
      item.vatRate = vatRate
      item.totalWithVat = item.totalWithoutVat // no VAT added
    }
  }
  const subtotal = items.reduce((sum, item) => sum + item.totalWithoutVat, 0)
  const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0)
  const grandTotalRaw = subtotal + vatTotal
  // Round to whole CZK (standard accounting rounding — haléřové vyrovnání)
  const grandTotal = Math.round(grandTotalRaw)

  const today = new Date().toISOString().split('T')[0]
  const paymentDays = config?.payment_term_days ?? 30
  const dueDate = new Date(new Date(duzpDate).getTime() + paymentDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const zr = getZrCompanyDetails()

  const categoryLabel = (jobCategory || 'opravy').charAt(0).toUpperCase() + (jobCategory || 'opravy').slice(1)
  let note: string
  if (config?.note_template) {
    note = config.note_template
      .replace(/\{JOB_REF\}/g, jobReference)
      .replace(/\{CATEGORY\}/g, categoryLabel)
      .replace(/\{PARTNER_NAME\}/g, partnerBilling.name)
      .replace(/\{VAT_RATE\}/g, String(vatRate))
  } else {
    note = reverseCharge
      ? `${categoryLabel} — zakázka č. ${jobReference}. DPH ${vatRate} % — daň odvede zákazník dle § 92a zákona o DPH (režim přenesení daňové povinnosti).`
      : `${categoryLabel} — zakázka č. ${jobReference}. DPH ${vatRate} %.`
  }

  // Append per-invoice custom note if provided
  if (customNote?.trim()) {
    note = note + '\n' + customNote.trim()
  }

  // CZ legal: registration in OR (Obchodní rejstřík)
  note = note + '\nZapsána v OR u Městského soudu v Praze, oddíl C, vložka 218450.'

  return {
    invoiceNumber,
    variabilniSymbol: vs,
    issueDate: today,
    taxableDate: duzpDate,
    dueDate,
    supplier: {
      name: ZR_FIXED.name,
      street: ZR_FIXED.street,
      city: ZR_FIXED.city,
      psc: ZR_FIXED.psc,
      ico: ZR_FIXED.ico,
      dic: ZR_FIXED.dic,
      iban: config?.bank_iban || zr.iban,
      bankAccount: config?.bank_account || process.env.ZR_BANK_ACCOUNT || '',
      bankCode: config?.bank_code || process.env.ZR_BANK_CODE || '',
    },
    buyer: partnerBilling,
    reverseCharge,
    vatRate,
    items,
    subtotal,
    vatTotal,
    grandTotal,
    jobReference,
    jobCategory,
    partnerClaimNumber: partnerClaimNumber ?? null,
    note,
    currency: pricingResult.insurer.billingCurrency ?? 'CZK',
  }
}

/**
 * Extract partner billing data from partner.custom_fields.
 * Falls back to partner.name when custom billing name is not set.
 */
export function getPartnerBillingData(partner: {
  name: string
  custom_fields?: Record<string, unknown> | null
}): { name: string; street: string; city: string; psc: string; ico: string; dic: string } {
  const cf = (partner.custom_fields ?? {}) as Record<string, string>
  return {
    name: cf.billing_name || partner.name,
    street: cf.billing_street || '',
    city: cf.billing_city || '',
    psc: cf.billing_psc || '',
    ico: cf.ico || '',
    dic: cf.dic || '',
  }
}
