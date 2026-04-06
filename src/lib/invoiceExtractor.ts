/**
 * AI Invoice Extractor — reads invoice PDF/image and extracts structured data.
 *
 * Uses OpenAI Vision API (gpt-5.4) to extract:
 * - Invoice number, evidencni cislo
 * - Issue date, DUZP, due date
 * - Total amount (with/without VAT)
 * - VAT rate and amount
 * - Supplier ICO, DIC, name, address
 * - Variable symbol (VS)
 * - Bank account / IBAN
 * - Line items (description, qty, unit, price)
 */

import { visionCompletion, chatCompletion, parseLLMJson } from '@/lib/llm'

/**
 * Extract plain text from a PDF data URL using pdfjs-dist (legacy Node.js build).
 * Returns null if input is not a PDF or extraction fails.
 */
async function extractTextFromPdf(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith('data:application/pdf')) return null
  try {
    const base64 = dataUrl.replace(/^data:application\/pdf;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const uint8 = new Uint8Array(buffer)
    const { getDocument, GlobalWorkerOptions } = await import(
      /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs' as string
    ) as typeof import('pdfjs-dist')
    const { pathToFileURL } = await import('url')
    const { resolve } = await import('path')
    GlobalWorkerOptions.workerSrc = pathToFileURL(
      resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
    ).href
    const pdf = await getDocument({ data: uint8, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise
    const texts: string[] = []
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .filter((item): item is import('pdfjs-dist/types/src/display/api').TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ')
      texts.push(pageText)
    }
    return texts.join('\n').trim() || null
  } catch (err) {
    console.error('[InvoiceExtractor] PDF text extraction failed:', (err as Error).message)
    return null
  }
}

export interface ExtractedInvoiceData {
  invoiceNumber: string | null
  evidencniCislo: string | null
  issueDate: string | null          // YYYY-MM-DD
  taxableDate: string | null        // DUZP - YYYY-MM-DD
  dueDate: string | null            // YYYY-MM-DD
  variabilniSymbol: string | null
  subtotal: number | null           // without VAT
  vatAmount: number | null
  grandTotal: number | null         // with VAT
  vatRate: number | null            // 12, 21, or 0
  supplierName: string | null
  supplierIco: string | null
  supplierDic: string | null
  supplierAddress: string | null
  supplierIban: string | null
  supplierBankAccount: string | null  // CZ format: 123456/0800
  currency: string
  note: string | null
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number
    totalPrice: number
  }>
  confidence: number                // 0-100, how confident AI is in extraction
}

const SYSTEM_PROMPT = `Jsi expert na cteni ceskych faktur. Analyzuj obrazek faktury a extrahuj strukturovana data.

Vrat JSON objekt s temito poli:
{
  "invoiceNumber": "cislo faktury (napr. FV-2026-00042)",
  "evidencniCislo": "evidencni cislo danoveho dokladu (pokud je jine nez cislo faktury)",
  "issueDate": "datum vystaveni ve formatu YYYY-MM-DD",
  "taxableDate": "datum uskutecneni zdanitelneho plneni (DUZP) ve formatu YYYY-MM-DD",
  "dueDate": "datum splatnosti ve formatu YYYY-MM-DD",
  "variabilniSymbol": "variabilni symbol pro platbu",
  "subtotal": cislo bez DPH,
  "vatAmount": castka DPH,
  "grandTotal": celkova castka s DPH,
  "vatRate": sazba DPH (12, 21, nebo 0),
  "supplierName": "jmeno/nazev dodavatele (firma nebo OSVC)",
  "supplierIco": "ICO dodavatele",
  "supplierDic": "DIC dodavatele",
  "supplierAddress": "cela adresa dodavatele",
  "supplierIban": "IBAN dodavatele (pokud je uveden)",
  "supplierBankAccount": "cislo uctu ve formatu 123456/0800",
  "currency": "CZK nebo EUR",
  "note": "poznamka na fakture (pokud existuje)",
  "lineItems": [
    {
      "description": "popis polozky",
      "quantity": cislo,
      "unit": "jednotka (hod, ks, km, m2...)",
      "unitPrice": jednotkova cena bez DPH,
      "totalPrice": celkova cena polozky bez DPH
    }
  ],
  "confidence": cislo 0-100 jak jsi si jisty vysledkem
}

Pravidla:
- Pokud hodnotu nenajdes, nastav null
- Castky vzdy jako cisla (ne stringy), bez mezer a meny
- Datum vzdy ve formatu YYYY-MM-DD
- ICO a DIC bez mezer
- Variabilni symbol: hledej "VS:", "Var. symbol:", "Variabilni symbol:" nebo cislo v platebnich udajich
- Pokud je text "Neplatce DPH" nebo "Neni platcem DPH", nastav vatRate na 0 a vatAmount na 0
- Pokud je text "Prenesena danova povinnost" nebo "§92a", nastav vatRate na 0 s poznamkou
- confidence: 90+ pokud je faktura citelna a kompletni, 50-89 pokud chybi nektere udaje, pod 50 pokud je necitelna`

const USER_MESSAGE = 'Precti tuto fakturu a extrahuj vsechna data do JSON formatu podle instrukci.'

/**
 * Extract structured data from an invoice image or PDF using AI.
 *
 * - Images (JPEG, PNG): sent to Vision API
 * - PDFs: text extracted with pdfjs-dist, then sent to text-based LLM
 *
 * @param imageDataUrl - base64 data URL of the invoice
 * @returns Extracted data or null if extraction failed
 */
export async function extractInvoiceData(imageDataUrl: string): Promise<ExtractedInvoiceData | null> {
  const isPdf = imageDataUrl.startsWith('data:application/pdf')

  if (isPdf) {
    const pdfText = await extractTextFromPdf(imageDataUrl)
    if (!pdfText || pdfText.length < 20) {
      console.warn('[InvoiceExtractor] PDF text too short or empty, length:', pdfText?.length ?? 0)
      return null
    }

    const result = await chatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `${USER_MESSAGE}\n\nText faktury (extrahovaný z PDF):\n\n${pdfText}`,
      maxTokens: 2000,
      temperature: 0.1,
      jsonMode: true,
    })

    return parseLLMJson<ExtractedInvoiceData>(result)
  }

  // Image path: use Vision API
  const MAX_IMAGE_BASE64_LENGTH = 4 * 1024 * 1024 * 1.37 // ~4MB binary as base64
  if (imageDataUrl.length > MAX_IMAGE_BASE64_LENGTH) {
    return null
  }

  const result = await visionCompletion({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: USER_MESSAGE,
    imageDataUrls: [imageDataUrl],
    maxTokens: 2000,
    temperature: 0.1,
    jsonMode: true,
    reasoning: 'low',
  })

  return parseLLMJson<ExtractedInvoiceData>(result)
}
