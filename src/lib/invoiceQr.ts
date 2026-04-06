/**
 * invoiceQr.ts — QR kódy pre české a slovenské faktúry
 *
 * 1. QR Platba (SPD formát) — český bankový štandard pre platby v CZK
 *    Formát: SPD*1.0*ACC:{IBAN}*AM:{suma}*CC:CZK*X-VS:{VS}*...
 *    Funguje vo všetkých českých bankových appkách (ČSOB, KB, ČS, Fio, Moneta, mBank...)
 *
 * 2. Pay by Square — slovenský bankový štandard (SBA) pre platby v EUR
 *    Generuje sa cez knižnicu `bysquare` (LZMA + Base32hex kódovanie)
 *    Funguje vo všetkých slovenských bankových appkách (Tatra, VÚB, SLSP, Fio, mBank...)
 *
 * 3. ISDOC QR — český štandard pre import faktúr do účtovného SW
 *    Formát: SID*1.0*ID:{číslo faktúry}*DD:{dátum}*AM:{suma}*...
 *    Podporovaný v Pohoda, Money S3, ABRA, FlexiBee
 *    Len pre CZK faktúry — pre EUR faktúry sa nevytvára (ISDOC je česká norma).
 */

import type { InvoiceData } from '@/types/dispatch'

/** Sanitize SPD field values — remove * and newlines, truncate to 60 chars */
function sanitizeSpd(val: string): string {
  return val.replace(/[*\n\r]/g, '').slice(0, 60)
}

/**
 * Generate a "QR Platba" (SPD) QR code for Czech bank payment.
 *
 * SPD = Short Payment Descriptor — standard Českej bankovej asociácie.
 * Ref: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 *
 * Returns a base64 PNG data URI, or '' on failure / missing data.
 */
async function generateSpdQr(invoice: InvoiceData): Promise<string> {
  const iban = invoice.supplier?.iban
  if (!iban) return ''

  const QRCode = (await import('qrcode')).default

  // Clean IBAN — remove spaces
  const cleanIban = iban.replace(/\s/g, '')

  // Build SPD string
  const parts: string[] = [
    'SPD*1.0',
    `ACC:${cleanIban}`,
  ]

  // Amount (max 2 decimal places)
  if (invoice.grandTotal > 0) {
    parts.push(`AM:${invoice.grandTotal.toFixed(2)}`)
  }

  // Currency
  parts.push('CC:CZK')

  // Variable symbol (max 10 digits)
  if (invoice.variabilniSymbol) {
    const vs = invoice.variabilniSymbol.replace(/\D/g, '').slice(0, 10)
    if (vs) parts.push(`X-VS:${vs}`)
  }

  // Due date (YYYYMMDD)
  if (invoice.dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate)) {
      throw new Error('Invalid dueDate format for SPD QR — expected YYYY-MM-DD')
    }
    parts.push(`DT:${invoice.dueDate.replace(/-/g, '')}`)
  }

  // Payment note (max 60 chars, no *, no newlines)
  if (invoice.invoiceNumber) {
    const msg = sanitizeSpd(`Faktura ${invoice.invoiceNumber}`)
    parts.push(`MSG:${msg}`)
  }

  // Beneficiary name (max 35 chars)
  if (invoice.supplier.billing_name) {
    const name = sanitizeSpd(invoice.supplier.billing_name).slice(0, 35)
    parts.push(`RN:${name}`)
  }

  const spdString = parts.join('*')

  const dataUri = await QRCode.toDataURL(spdString, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  })
  return dataUri
}

/**
 * Generate a "Pay by Square" QR code for Slovak bank payment (EUR).
 *
 * Pay by Square = slovenský bankový štandard SBA.
 * Ref: https://www.sbaonline.sk/projekt/platby-qr-kodom/
 *
 * Uses the `bysquare` npm package which handles LZMA compression + Base32hex encoding.
 * Returns a base64 PNG data URI, or '' on failure / missing data.
 */
async function generateBySquareQr(invoice: InvoiceData): Promise<string> {
  const iban = invoice.supplier?.iban
  if (!iban) return ''

  // Dynamic imports to keep them lazy and avoid SSR issues
  const { encode, PaymentOptions } = await import('bysquare/pay')
  const QRCode = (await import('qrcode')).default

  // Variable symbol — digits only, max 10
  const vs = invoice.variabilniSymbol
    ? invoice.variabilniSymbol.replace(/\D/g, '').slice(0, 10)
    : undefined

  // Payment note
  const note = invoice.invoiceNumber
    ? `Faktura ${invoice.invoiceNumber}`.slice(0, 140)
    : undefined

  // Beneficiary name — max 70 chars per spec
  const beneficiaryName = (invoice.supplier.billing_name ?? '').slice(0, 70)

  // Due date: bysquare expects YYYYMMDD
  const dueDate = invoice.dueDate
    ? invoice.dueDate.replace(/-/g, '')
    : undefined

  const qrString = encode({
    payments: [
      {
        type: PaymentOptions.PaymentOrder,
        amount: invoice.grandTotal,
        currencyCode: 'EUR',
        variableSymbol: vs,
        paymentDueDate: dueDate,
        paymentNote: note,
        bankAccounts: [{ iban: iban.replace(/\s/g, '') }],
        beneficiary: { name: beneficiaryName },
      },
    ],
  })

  const dataUri = await QRCode.toDataURL(qrString, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  })
  return dataUri
}

/**
 * Generate a payment QR code for an invoice.
 *
 * Routes automatically based on invoice currency:
 * - CZK → QR Platba (SPD format) — Czech standard
 * - EUR → Pay by Square (bysquare) — Slovak standard
 *
 * Returns a base64 PNG data URI, or '' on failure / missing data.
 */
export async function generatePayBySquareQr(invoice: InvoiceData): Promise<string> {
  try {
    if (invoice.currency === 'EUR') {
      return await generateBySquareQr(invoice)
    }
    return await generateSpdQr(invoice)
  } catch (err) {
    console.error('[InvoiceQR] Payment QR generation failed:', err)
    return ''
  }
}

/**
 * Generate an "ISDOC QR" code for accounting software import.
 *
 * SID = Short Invoice Descriptor — zjednodušený formát pre import faktúr.
 * Ref: https://isdoc.cz/
 *
 * Encodes: invoice ID, dates, amounts, tax info, supplier/buyer IDs.
 * Supported by: Pohoda, Money S3, ABRA, FlexiBee, Vario.
 *
 * NOTE: ISDOC is a Czech standard — only generated for CZK invoices.
 * EUR (Slovak) invoices return '' as there is no equivalent SK accounting QR standard.
 *
 * Returns a base64 PNG data URI, or '' on failure / missing data.
 */
export async function generateInvoiceBySquareQr(invoice: InvoiceData): Promise<string> {
  try {
    // ISDOC is a Czech standard — not applicable for EUR/SK invoices
    if (invoice.currency === 'EUR') return ''
    if (!invoice.invoiceNumber) return ''

    const QRCode = (await import('qrcode')).default

    // Build SID (Short Invoice Descriptor) string
    const parts: string[] = [
      'SID*1.0',
    ]

    // Invoice ID
    parts.push(`ID:${invoice.invoiceNumber.slice(0, 40).replace(/[*\n\r]/g, '')}`)

    // Issue date (YYYYMMDD)
    parts.push(`DD:${invoice.issueDate.replace(/-/g, '')}`)

    // Taxable date / DUZP (datum uskutečnění zdanitelného plnění)
    if (invoice.taxableDate) {
      parts.push(`DUZP:${invoice.taxableDate.replace(/-/g, '')}`)
    }

    // Due date / DT (datum splatnosti)
    if (invoice.dueDate) {
      parts.push(`DT:${invoice.dueDate.replace(/-/g, '')}`)
    }

    // Total amount
    parts.push(`AM:${invoice.grandTotal.toFixed(2)}`)

    // Tax base (without VAT)
    parts.push(`TB:${invoice.subtotal.toFixed(2)}`)

    // Tax total
    parts.push(`T:${invoice.vatTotal.toFixed(2)}`)

    // Currency
    parts.push('CC:CZK')

    // Variable symbol
    if (invoice.variabilniSymbol) {
      const vs = invoice.variabilniSymbol.replace(/\D/g, '').slice(0, 10)
      if (vs) parts.push(`X-VS:${vs}`)
    }

    // Supplier IBAN
    if (invoice.supplier.iban) {
      parts.push(`ACC:${invoice.supplier.iban.replace(/\s/g, '')}`)
    }

    // Supplier IČO
    if (invoice.supplier.ico) {
      parts.push(`INI:${invoice.supplier.ico}`)
    }

    // Supplier DIČ
    if (invoice.supplier.dic) {
      parts.push(`VII:${invoice.supplier.dic}`)
    }

    // Buyer IČO
    if (invoice.buyer.ico) {
      parts.push(`INR:${invoice.buyer.ico}`)
    }

    // Buyer DIČ
    if (invoice.buyer.dic) {
      parts.push(`VIR:${invoice.buyer.dic}`)
    }

    // DPH breakdown per rate
    const taxGroups = new Map<number, { base: number; tax: number }>()
    for (const item of invoice.items) {
      const existing = taxGroups.get(item.vatRate) || { base: 0, tax: 0 }
      existing.base += item.totalWithoutVat
      existing.tax += item.vatAmount
      taxGroups.set(item.vatRate, existing)
    }

    let taxIdx = 1
    taxGroups.forEach(({ base, tax }, rate) => {
      parts.push(`TP${taxIdx}:${rate}`)
      parts.push(`TB${taxIdx}:${base.toFixed(2)}`)
      parts.push(`T${taxIdx}:${tax.toFixed(2)}`)
      taxIdx++
    })

    const sidString = parts.join('*')

    const dataUri = await QRCode.toDataURL(sidString, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    return dataUri
  } catch (err) {
    console.error('[InvoiceQR] ISDOC QR generation failed:', err)
    return ''
  }
}
