/**
 * Accountant CSV field definitions — shared between:
 * - Server: accountantEmail.ts (CSV generation)
 * - Client: PaymentsAccountantTab (field picker UI)
 *
 * Kept in a separate file to avoid importing nodemailer on the client.
 */

export interface AccountantCsvFieldDef {
  key: string
  label: string
  header: string
}

/**
 * All available CSV fields. Order here = default column order.
 * `key` is persisted in app_settings, `header` is the CSV column name,
 * `label` is the human-readable name shown in the settings UI.
 */
export const ACCOUNTANT_CSV_FIELDS: AccountantCsvFieldDef[] = [
  { key: 'invoiceNumber',    label: 'Cislo faktury',     header: 'Cislo faktury' },
  { key: 'evidencniCislo',   label: 'Evidencni cislo',   header: 'Evidencni cislo' },
  { key: 'issueDate',        label: 'Datum vystaveni',   header: 'Datum vystaveni' },
  { key: 'taxableDate',      label: 'DUZP',              header: 'DUZP' },
  { key: 'dueDate',          label: 'Splatnost',         header: 'Splatnost' },
  { key: 'supplier',         label: 'Dodavatel',         header: 'Dodavatel' },
  { key: 'ico',              label: 'ICO',               header: 'ICO' },
  { key: 'dic',              label: 'DIC',               header: 'DIC' },
  { key: 'variabilniSymbol', label: 'Variabilni symbol', header: 'Variabilni symbol' },
  { key: 'subtotal',         label: 'Zaklad DPH',        header: 'Zaklad DPH' },
  { key: 'dphRate',          label: 'Sazba DPH',         header: 'Sazba DPH' },
  { key: 'vatTotal',         label: 'DPH',               header: 'DPH' },
  { key: 'grandTotal',       label: 'Celkem',            header: 'Celkem' },
  { key: 'currency',         label: 'Mena',              header: 'Mena' },
  { key: 'dphRegime',        label: 'Rezim DPH',         header: 'Rezim DPH' },
  { key: 'iban',             label: 'IBAN',              header: 'IBAN' },
  { key: 'jobReference',     label: 'Zakazka',           header: 'Zakazka' },
  { key: 'technicianName',   label: 'Technik',           header: 'Technik' },
]

/** All field keys — default when no settings saved */
export const ALL_CSV_FIELD_KEYS = ACCOUNTANT_CSV_FIELDS.map(f => f.key)

// ---------------------------------------------------------------------------
// Output format definitions
// ---------------------------------------------------------------------------

export interface OutputFormatDef {
  key: string
  label: string
  description: string
}

/**
 * Available output formats for the accountant email.
 * Each can be toggled on/off independently.
 */
export const ACCOUNTANT_OUTPUT_FORMATS: OutputFormatDef[] = [
  { key: 'csv',     label: 'CSV prehled',  description: 'Tabulka so vsetkymi faktúrami (pre Premier import/kontrolu)' },
  { key: 'isdoc',   label: 'ISDOC XML',    description: 'Jeden XML subor per faktura (nativny import do Premier, Pohoda, Money S3)' },
  { key: 'premier', label: 'Premier custom XML',  description: 'Custom XML subor pre import do Premier' },
  { key: 'pdf',     label: 'PDF original', description: 'Originalny PDF/obrazok faktury od technika' },
]

/** All format keys — default when no settings saved */
export const ALL_OUTPUT_FORMAT_KEYS = ACCOUNTANT_OUTPUT_FORMATS.map(f => f.key)
