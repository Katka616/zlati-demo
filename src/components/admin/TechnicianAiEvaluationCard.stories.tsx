import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TechnicianAiEvaluationCard from './TechnicianAiEvaluationCard'
import type { TechnicianAiEvaluation } from '@/lib/technicianAiEvaluation'

const meta: Meta<typeof TechnicianAiEvaluationCard> = {
  title: 'Admin/TechnicianAiEvaluationCard',
  component: TechnicianAiEvaluationCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'AI hodnotenie technika. Zobrazuje kľúčové metriky (miera dokončenia, body match, response time, NPS skóre), trend vzťahu (engaged/stable/at_risk) a AI signály s odporúčaniami. Generované modelom GPT-4 na základe histórie zákaziek.',
      },
    },
  },
  argTypes: {
    isLoading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof TechnicianAiEvaluationCard>

const mockEvaluation: TechnicianAiEvaluation = {
  technicianId: 7,
  generatedAt: new Date().toISOString(),
  completionRate: 0.94,
  bodyMatchScore: 0.87,
  avgResponseTime: 12,
  estimatedMonthlyRevenue: 48000,
  npsScore: 8.4,
  relationshipTrend: 'engaged',
  riskLevel: 'low',
  signals: [
    {
      type: 'performance',
      tone: 'good',
      headline: 'Vynikajúca miera dokončenia',
      detail: 'Technik dokončí 94% zákaziek bez eskalácie. Priemerná hodnota je 78%.',
      recommendation: null,
    },
    {
      type: 'availability',
      tone: 'warning',
      headline: 'Obmedzená dostupnosť víkendoch',
      detail: 'V poslednom mesiaci odmietol 3 víkendové zákazky. Môže ísť o súkromné záväzky.',
      recommendation: 'Overiť dostupnosť pri prideľovaní víkendových zákaziek.',
    },
  ],
  summary: 'Tomáš Kovář je spoľahlivý technik s vysokou mierou spokojnosti zákazníkov. Odporúčame naďalej prideľovať prémiové zákazky.',
}

export const Engaged: Story = {
  name: 'Naklonený firme (engaged)',
  args: {
    evaluation: mockEvaluation,
    isLoading: false,
    error: null,
  },
}

export const AtRisk: Story = {
  name: 'Riziko odlivu (at_risk)',
  args: {
    evaluation: {
      ...mockEvaluation,
      relationshipTrend: 'at_risk',
      riskLevel: 'high',
      completionRate: 0.71,
      npsScore: 5.2,
      signals: [
        {
          type: 'churn_risk',
          tone: 'danger',
          headline: 'Znížená aktivita za posledný mesiac',
          detail: 'Technik odmietol 7 zákaziek za posledné 2 týždne bez uvedenia dôvodu.',
          recommendation: 'Kontaktovať technika a zistiť situáciu. Zvážiť alternatívne pridelenie zákaziek.',
        },
      ],
      summary: 'Technik vykazuje znaky odlivu. Odporúčame osobný rozhovor čo najskôr.',
    },
    isLoading: false,
    error: null,
  },
}

export const Loading: Story = {
  name: 'Načítavanie',
  args: {
    evaluation: null,
    isLoading: true,
    error: null,
  },
}

export const WithError: Story = {
  name: 'Chyba načítania',
  args: {
    evaluation: null,
    isLoading: false,
    error: 'Nepodarilo sa načítať AI hodnotenie. Skúste znova.',
  },
}
