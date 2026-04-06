import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CustomerEmotionCard from './CustomerEmotionCard'

const meta: Meta<typeof CustomerEmotionCard> = {
  title: 'Admin/CustomerEmotionCard',
  component: CustomerEmotionCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'AI analýza emócií zákazníka na základe chatových správ. Volá GET /api/admin/jobs/{id}/customer-emotion. Zobrazuje sentiment (very_negative → very_positive), dôvod a odporúčané akcie. Poslúcha udalosť job-customer-emotion-refresh pre live aktualizácie.',
      },
    },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('customer-emotion')) {
        return new Response(JSON.stringify({
          success: true,
          evaluation: {
            sentiment: 'negative',
            score: 2,
            reasons: ['Zákazník čaká dlhšie ako očakával', 'Komunikácia bola prerušená'],
            recommendedActions: ['Zavolať zákazníkovi osobne', 'Ponúknuť zľavu alebo prioritné vybavenie'],
            summary: 'Zákazník je nespokojný s dlhou dobou čakania. Odporúčame osobný kontakt.',
            analyzedAt: new Date().toISOString(),
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof CustomerEmotionCard>

export const Default: Story = {
  args: { jobId: 42 },
}

export const VeryPositive: Story = {
  name: 'Veľmi pozitívny zákazník',
  decorators: [
    (Story) => {
      const original = window.fetch
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('customer-emotion')) {
          return new Response(JSON.stringify({
            success: true,
            evaluation: {
              sentiment: 'very_positive',
              score: 5,
              reasons: ['Technik prišiel v dohodnutom čase', 'Problém bol rýchlo vyriešený'],
              recommendedActions: ['Požiadať o hodnotenie'],
              summary: 'Zákazník je veľmi spokojný. Ideálny čas na požiadanie o recenziu.',
              analyzedAt: new Date().toISOString(),
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        return original(input, init)
      }
      return <Story />
    },
  ],
  args: { jobId: 43 },
}

export const NoData: Story = {
  name: 'Žiadne dáta (nová zákazka)',
  decorators: [
    (Story) => {
      const original = window.fetch
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('customer-emotion')) {
          return new Response(JSON.stringify({ success: true, evaluation: null }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        }
        return original(input, init)
      }
      return <Story />
    },
  ],
  args: { jobId: 44 },
}
