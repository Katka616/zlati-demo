import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import InvoiceUploadModal from './InvoiceUploadModal'

const meta: Meta<typeof InvoiceUploadModal> = {
  title: 'Admin/InvoiceUploadModal',
  component: InvoiceUploadModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**InvoiceUploadModal** — 3-krokový wizard pre upload faktúry.

**Kroky:**
1. Výber zákazky (ID) + typ faktúry (technician / partner)
2. Upload súboru (JPEG, PNG, PDF, max 10 MB) — drag & drop alebo klik
3. AI extrakcia dát (GPT-4o vision) + výsledky s confidence skóre

**API volania:**
- POST /api/admin/invoices/extract — extrahuje dáta z obrázka
- POST /api/admin/invoices/upload — uloží faktúru do DB

**Props:**
| Prop | Typ | Popis |
|------|-----|-------|
| \`isOpen\` | \`boolean\` | Zobrazí/skryje modal |
| \`onClose\` | \`() => void\` | Zatvoriť modal |
| \`onSuccess\` | \`(data) => void\` | Callback po úspešnom uploade |
| \`preselectedJobId\` | \`number?\` | Predvyplnené ID zákazky |
| \`type\` | \`'technician' \| 'partner'\` | Typ faktúry (default: technician) |
        `,
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onSuccess: { action: 'success' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('invoices/extract')) {
        return new Response(JSON.stringify({
          success: true,
          extracted: {
            invoiceNumber: 'FAK-2026-0042',
            variabilniSymbol: '20260042',
            issueDate: '2026-03-15',
            grandTotal: 1871,
            vatAmount: 200,
            subtotal: 1671,
            vatRate: 0.12,
            supplierName: 'Tomáš Kovář s.r.o.',
            supplierIco: '12345678',
            confidence: 0.93,
            suggestedJobs: [{ id: 42, reference_number: 'ZR-2026-00042', customer_name: 'Jana Nováková' }],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('invoices/upload') || url.includes('invoices')) {
        return new Response(JSON.stringify({ success: true, invoiceId: 99 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof InvoiceUploadModal>

export const Open: Story = {
  name: 'Otvorený — krok 1',
  args: {
    isOpen: true,
    onClose: () => {},
    onSuccess: (data) => console.log('Success:', data),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export const WithPreselectedJob: Story = {
  name: 'S predvyplnenou zákazkou',
  args: {
    isOpen: true,
    preselectedJobId: 42,
    onClose: () => {},
    onSuccess: (data) => console.log('Success:', data),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
