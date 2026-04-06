import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import LivePricingWidget from './LivePricingWidget'

/** Mock API response — zákazka v rozpočte */
const withinBudgetResponse = {
  estimatedHours: 2.5,
  estimatedKm: 18,
  estimatedMaterialsCost: 420,
  estimatedMaterials: [
    { name: 'Kartuša termostatická', quantity: 1, unit: 'ks', pricePerUnit: 280, total: 280, coverageStatus: 'covered' },
    { name: 'Tesnenie sada', quantity: 2, unit: 'ks', pricePerUnit: 70, total: 140, coverageStatus: 'uncovered' },
  ],
  liveHoursOnSite: 1.5,
  liveKmMeasured: 18,
  estimatePricing: { technicianPay: 1850 },
  livePricing: { technicianPay: 1210 },
  currency: 'Kč',
  deviation: { costPercent: -6 },
}

/** Mock API response — zákazka blízko limitu */
const nearLimitResponse = {
  ...withinBudgetResponse,
  liveHoursOnSite: 2.8,
  livePricing: { technicianPay: 2090 },
  deviation: { costPercent: 13 },
}

/** Mock API response — zákazka prekročila rozpočet */
const overBudgetResponse = {
  ...withinBudgetResponse,
  liveHoursOnSite: 4.0,
  liveKmMeasured: 24,
  livePricing: { technicianPay: 2980 },
  deviation: { costPercent: 61 },
}

const meta = {
  title: 'Dispatch/LivePricingWidget',
  component: LivePricingWidget,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Widget priebežného sledovania ceny zákazky voči odhadu technika. Porovnáva odhadnuté hodiny/km s realitou a zobrazuje percentuálnu odchýlku. Zelená = v rozpočte, oranžová = blíži sa k limitu, červená = prekročený rozpočet. Dáta sa dopĺňajú z API každých 20 minút.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    compact: { control: 'boolean' },
    jobId: { control: { type: 'number' } },
  },
  args: {
    jobId: 42,
    lang: 'sk',
    compact: false,
    apiUrl: '/api/dispatch/live-pricing/42',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--bg-card, #fff)', borderRadius: 16, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LivePricingWidget>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'V rozpočte (zelená)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dispatch/live-pricing/42', () =>
          HttpResponse.json(withinBudgetResponse)
        ),
      ],
    },
  },
}

export const NearLimit: Story = {
  name: 'Blíži sa k limitu (oranžová)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dispatch/live-pricing/42', () =>
          HttpResponse.json(nearLimitResponse)
        ),
      ],
    },
  },
}

export const OverBudget: Story = {
  name: 'Prekročený rozpočet (červená)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dispatch/live-pricing/42', () =>
          HttpResponse.json(overBudgetResponse)
        ),
      ],
    },
  },
}

export const CompactBadge: Story = {
  name: 'Kompaktný badge (compact: true)',
  args: { compact: true },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dispatch/live-pricing/42', () =>
          HttpResponse.json(withinBudgetResponse)
        ),
      ],
    },
  },
}
