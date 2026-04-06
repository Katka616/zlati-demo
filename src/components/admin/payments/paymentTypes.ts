/**
 * Shared types for the Admin Payments page tabs.
 */

export type TabKey = 'due' | 'batches' | 'archive' | 'accountant' | 'partners'

export interface ReadyInvoice {
  id: number
  reference_number: string
  assigned_to: number | null
  customer_name: string
  customer_city: string
  payment_status: string | null
  crm_step: number
  invoice_data: {
    grandTotal?: number
    variabilniSymbol?: string
    invoiceNumber?: string
    invoice_status?: string
    [key: string]: unknown
  } | null
  settlement_data: {
    technicianPay?: number
    [key: string]: unknown
  } | null
  technician_name: string | null
  technician_iban: string | null
}

export interface BatchPayment {
  id: number
  batch_id: string
  technician_id: number
  job_id: number
  amount: number
  currency: string
  status: string
  invoice_number: string | null
  vs: string | null
  iban: string | null
  beneficiary_name: string | null
  technician_name: string | null
  job_reference: string | null
}

export interface PaymentBatch {
  id: string
  status: import('@/lib/constants').BatchStatus
  total_amount: number
  payment_count: number
  actual_payment_count?: number
  technician_count?: number
  debtor_name: string
  debtor_iban: string
  note: string | null
  created_by: string | null
  approved_by: string | null
  sepa_filename: string | null
  isdoc_filename: string | null
  created_at: string
  approved_at: string | null
  exported_at: string | null
  sent_at: string | null
  completed_at: string | null
  payments?: BatchPayment[]
}

export interface InvoiceDataFields {
  method?: string
  invoiceNumber?: string | null
  evidencniCislo?: string | null
  issueDate?: string
  taxableDate?: string
  dueDate?: string
  variabilniSymbol?: string | null
  grandTotal?: number
  subtotal?: number
  vatTotal?: number
  dphRate?: string | null
  invoice_status?: string
  rejection_reason?: string | null
  uploadedFileId?: number
  supplier?: {
    billing_name?: string | null
    ico?: string | null
    dic?: string | null
    iban?: string | null
  }
  [key: string]: unknown
}

export interface RegistryInvoice {
  id: number
  reference_number: string
  assigned_to: number | null
  customer_name: string
  customer_city: string
  partner_id: number | null
  partner_name: string | null
  crm_step: number
  payment_status: string | null
  invoice_data: InvoiceDataFields | null
  settlement_data: Record<string, unknown> | null
  technician_name: string | null
  technician_iban: string | null
  uploaded_file_id: number | null
}

export interface ExtractedData {
  invoiceNumber: string | null
  issueDate: string | null
  taxableDate: string | null
  dueDate: string | null
  variabilniSymbol: string | null
  subtotal: number | null
  vatAmount: number | null
  grandTotal: number | null
  vatRate: number | null
  supplierName: string | null
  supplierIco: string | null
  supplierDic: string | null
  supplierIban: string | null
  supplierBankAccount: string | null
  lineItems: Array<{ description: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }>
  confidence: number
}

export interface PartnerInvoiceRow {
  id: number
  job_id: number
  partner_id: number
  vs: string
  invoice_number: string
  costs_total: number
  vat_rate: number
  total_with_vat: number
  client_surcharge: number
  status: string
  issue_date: string
  duzp: string
  due_date: string
  paid_at: string | null
  paid_amount: number | null
  partner_claim_number: string | null
  job_category: string | null
  job_reference: string | null
  created_at: string
}

export interface SendHistoryItem {
  id: number
  job_id: number
  new_value: string
  performed_by: string
  created_at: string
  reference_number: string | null
  invoice_number: string | null
  amount: string | null
  technician_name: string | null
}
