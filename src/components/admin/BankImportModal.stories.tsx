import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import BankImportModal from './BankImportModal'

const meta: Meta<typeof BankImportModal> = {
  title: 'Admin/BankImportModal',
  component: BankImportModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**BankImportModal** — Import bankového výpisu a automatické párovanie platieb.

3-krokový wizard:
1. **Import CSV** — vloženie obsahu bankového výpisu (manuálne paste alebo upload)
2. **Parsovanie** — auto-detekcia stĺpcov (VS, suma, dátum, protiúčet) s podporou ; aj , separátorov
3. **Párovanie** — volá POST /api/admin/payment-matching, zobrazuje výsledky:
   - ✅ Spárovaná (zelená)
   - ❓ Nenájdená (šedá)
   - 🔵 Už uhradená (modrá)
   - ⚠️ Nesedí suma (žltá)
   - ❌ Chyba (červená)

**Props:**
| Prop | Typ | Popis |
|------|-----|-------|
| \`onClose\` | \`() => void\` | Zatvoriť modal |
| \`onMatched\` | \`() => void\` | Callback po úspešnom párovaní |
        `,
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onMatched: { action: 'matched' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('payment-matching')) {
        return new Response(JSON.stringify({
          success: true,
          results: [
            { vs: '20260042', status: 'matched', jobId: 42, message: 'Zákazka ZR-2026-00042' },
            { vs: '20260043', status: 'not_found' },
            { vs: '20260041', status: 'already_paid' },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof BankImportModal>

export const Default: Story = {
  args: {
    onClose: () => {},
    onMatched: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
