/**
 * premierExport.ts — Premier-native XML generator for CZ invoices.
 *
 * Generates PremierData/FaktPrij XML for direct import into Premier accounting.
 * Used by the accountant (SK Premier install, EUR = local currency → CZK = valuta).
 *
 * Reference: docs/xml HM/xml_functions.py
 *
 * Structure:
 *   PremierData > SeznamFaktPrij > FaktPrij > Valuty > SouhrnDPH
 *
 * Document types (Typ):
 *   CZnepl  — Czech non-VAT payer
 *   CZDPH   — Czech standard VAT (12% or 21%)
 *   CZrevch — Czech reverse charge (§92a)
 */

import type { InvoiceData } from '@/types/dispatch'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(n: number): string {
  return n.toFixed(2)
}

// ---------------------------------------------------------------------------
// Internal mapping helpers
// ---------------------------------------------------------------------------

type PremierTyp = 'CZnepl' | 'CZDPH' | 'CZrevch'

function dphRateToTyp(dphRate: string | null | undefined): PremierTyp {
  if (dphRate === 'non_vat_payer') return 'CZnepl'
  if (dphRate === 'reverse_charge') return 'CZrevch'
  return 'CZDPH'
}

interface SouhrnDPH {
  zaklad0: string
  zaklad5: string  // 12% base
  zaklad22: string // 21% base (field name fixed in Premier; actual rate set by SazbaDPH2)
  dph5: string
  dph22: string
}

function buildSouhrnDPH(invoice: InvoiceData): SouhrnDPH {
  const zero = '0.00'
  switch (invoice.dphRate) {
    case 'non_vat_payer':
      return { zaklad0: fmt(invoice.grandTotal), zaklad5: zero, zaklad22: zero, dph5: zero, dph22: zero }
    case '12':
      return { zaklad0: zero, zaklad5: fmt(invoice.subtotal), zaklad22: zero, dph5: fmt(invoice.vatTotal), dph22: zero }
    case '21':
      return { zaklad0: zero, zaklad5: zero, zaklad22: fmt(invoice.subtotal), dph5: zero, dph22: fmt(invoice.vatTotal) }
    case 'reverse_charge':
      // Odvod dane je na odběrateli — základ uveden, DPH = 0
      return { zaklad0: zero, zaklad5: zero, zaklad22: fmt(invoice.subtotal), dph5: zero, dph22: zero }
    default:
      // dphRate is null or unrecognised — log and treat as 21%
      console.warn('[PremierExport] buildSouhrnDPH: unexpected dphRate', invoice.dphRate, '— defaulting to 21%')
      return { zaklad0: zero, zaklad5: zero, zaklad22: fmt(invoice.subtotal), dph5: zero, dph22: fmt(invoice.vatTotal) }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate Premier-native PremierData XML for a single CZK invoice.
 *
 * CZK is treated as "valuta" in the accountant's SK Premier install →
 * root element is <PremierData> with a <Valuty> wrapper for amounts.
 *
 * @param invoice  Full invoice data from custom_fields.invoice_data
 * @param opts     Additional job context for Popis field
 * @returns        Valid Premier XML string
 */
export function generatePremierXml(
  invoice: InvoiceData,
  opts?: { jobReference?: string; jobCategory?: string }
): string {
  const { jobReference, jobCategory } = opts || {}

  const popisParts = [jobReference, jobCategory].filter(Boolean)
  const popis = popisParts.length > 0 ? popisParts.join(', ') : (invoice.invoiceNumber || '')

  const typ = dphRateToTyp(invoice.dphRate)
  const sd = buildSouhrnDPH(invoice)
  const platceDph = invoice.dphRate !== 'non_vat_payer' ? '1' : '0'
  const s = invoice.supplier

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<PremierData>')
  lines.push('  <SeznamFaktPrij>')
  lines.push('    <FaktPrij>')
  lines.push(`      <Popis>${esc(popis)}</Popis>`)
  lines.push(`      <Vystaveno>${esc(invoice.issueDate)}</Vystaveno>`)
  lines.push(`      <DatUcPr>${esc(invoice.taxableDate)}</DatUcPr>`)
  lines.push(`      <PlnenoDPH>${esc(invoice.taxableDate)}</PlnenoDPH>`)
  lines.push(`      <Splatno>${esc(invoice.dueDate)}</Splatno>`)
  lines.push(`      <Doruceno>${esc(invoice.taxableDate)}</Doruceno>`)
  lines.push(`      <DatSkPoh>${esc(invoice.issueDate)}</DatSkPoh>`)
  lines.push(`      <VarSymbol>${esc(invoice.variabilniSymbol || '')}</VarSymbol>`)
  lines.push(`      <PrijatDokl>${esc(invoice.variabilniSymbol || invoice.invoiceNumber || '')}</PrijatDokl>`)
  lines.push(`      <Typ>${typ}</Typ>`)
  lines.push(`      <Poznamka>${esc(invoice.evidencniCislo || '')}</Poznamka>`)
  lines.push('      <SazbaDPH1>12</SazbaDPH1>')
  lines.push('      <SazbaDPH2>21</SazbaDPH2>')
  lines.push('      <Valuty>')
  lines.push('        <Mena>')
  lines.push('          <Kod>CZK</Kod>')
  lines.push('          <Mnozstvi>1</Mnozstvi>')
  lines.push('        </Mena>')
  lines.push('        <SouhrnDPH>')
  lines.push(`          <Zaklad0>${sd.zaklad0}</Zaklad0>`)
  lines.push(`          <Zaklad5>${sd.zaklad5}</Zaklad5>`)
  lines.push(`          <Zaklad22>${sd.zaklad22}</Zaklad22>`)
  lines.push(`          <DPH5>${sd.dph5}</DPH5>`)
  lines.push(`          <DPH22>${sd.dph22}</DPH22>`)
  lines.push('        </SouhrnDPH>')
  lines.push('        <Zaokrouhleni>0</Zaokrouhleni>')
  lines.push(`        <Celkem>${fmt(invoice.grandTotal)}</Celkem>`)
  lines.push('      </Valuty>')
  lines.push('      <DodOdb>')
  lines.push(`        <ObchNazev>${esc(s.billing_name || '')}</ObchNazev>`)
  lines.push('        <ObchAdresa>')
  lines.push(`          <Ulice>${esc(s.billing_street || '')}</Ulice>`)
  lines.push(`          <Misto>${esc(s.billing_city || '')}</Misto>`)
  lines.push(`          <PSC>${esc(s.billing_psc || '')}</PSC>`)
  lines.push('          <Stat>Ceska republika</Stat>')
  lines.push('          <KodStatu>CZ</KodStatu>')
  lines.push('        </ObchAdresa>')
  lines.push(`        <ICO>${esc(s.ico || '')}</ICO>`)
  lines.push(`        <DIC>${esc(s.dic || '')}</DIC>`)
  lines.push(`        <DanIC>${esc(s.dic || '')}</DanIC>`)
  lines.push(`        <PlatceDPH>${platceDph}</PlatceDPH>`)
  lines.push('      </DodOdb>')
  lines.push('    </FaktPrij>')
  lines.push('  </SeznamFaktPrij>')
  lines.push('</PremierData>')

  return lines.join('\n')
}

/**
 * Get filename for a single Premier XML export.
 * Format: Premier_FV-2026-00042.xml
 */
export function getPremierFilename(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[/\\:*?"<>|]/g, '_')
  return `Premier_${safe}.xml`
}
