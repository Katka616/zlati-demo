import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import EASubmissionPreview from './EASubmissionPreview'

const meta: Meta<typeof EASubmissionPreview> = {
  title: 'Admin/EASubmissionPreview',
  component: EASubmissionPreview,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal pre náhľad a odoslanie EA odhláška (Europ Assistance). Načíta preview dáta z GET /api/admin/jobs/{id}/ea-submit (GET mode) a potom odosiela cez POST. Zobrazuje riadky zákazky, priložené fotky, protokoly a celkovú sumu.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onSubmit: { action: 'submitted' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('ea-submit')) {
        if (!init || init.method !== 'POST') {
          return new Response(JSON.stringify({
            success: true,
            preview: {
              referenceNumber: 'ZR-2026-00042',
              partnerOrderId: 'EA-2026-88812',
              items: [
                { type: 'pausalni_sazba', quantity: 1, label: 'Paušální platba (1. hodina)', price: 890 },
                { type: 'hodinova_sazba', quantity: 0.5, label: 'Hodinová sazba (další hodiny)', price: 445 },
                { type: 'doprava', quantity: 28, label: 'Doprava', price: 224 },
                { type: 'material', quantity: 1, label: 'PVC sifón DN40', price: 312 },
              ],
              photos: [{}, {}],
              protocols: [{}],
              clientSurcharge: 0,
              expectedTotal: 1871,
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof EASubmissionPreview>

export const Open: Story = {
  name: 'Otvorený — načíta preview',
  args: {
    jobId: 42,
    isOpen: true,
    onClose: () => {},
    onSubmit: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}
