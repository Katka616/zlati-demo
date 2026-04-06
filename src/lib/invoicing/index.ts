/**
 * Invoicing domain — barrel re-export
 *
 * Import from here for a clean domain path:
 *   import { generateInvoiceHtml } from '@/lib/invoicing'
 *   import { buildPartnerInvoice } from '@/lib/invoicing'
 *   import { exportSepa } from '@/lib/invoicing'
 *
 * Original file paths continue to work for backward compatibility.
 */

export * from '../invoiceTemplate'
export * from '../invoiceQr'
export * from '../invoiceValidation'
export * from '../invoiceAutomation'
export * from '../invoiceExtractor'
export * from '../isdocExport'
export * from '../partnerInvoiceBuilder'
export * from '../partnerInvoiceTemplate'
export * from '../sepaExport'
export * from '../accountantEmail'
export * from '../quotePdf'
// quoteBuilder + costEstimates live in '@/lib/pricing' barrel (pricing domain)
export * from '../partnerCoverageRules'
