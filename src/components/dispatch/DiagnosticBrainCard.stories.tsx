import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import DiagnosticBrainCard from './DiagnosticBrainCard'
import type { DiagResult } from '@/types/diagnosticBrain'

const highConfidenceDiag: DiagResult = {
  confidence: 'high',
  categoryCode: 'vodoinstalater',
  scenarios: [
    {
      id: 'loose_faucet',
      label: 'Uvoľnená batéria / armatúra',
      probability: 78,
      estimatedHours: 1,
      estimatedMaterialCost: 150,
      requiredParts: [
        { name: 'Tesnenie batérie', brands: ['Grohe', 'Hansgrohe'], qty: 1, unit: 'ks' },
      ],
      procedure: ['Uzavrieť prívod vody', 'Vyskrutkovať batériu', 'Vymeniť tesnenie', 'Dotiahnuť'],
    },
    {
      id: 'pipe_joint',
      label: 'Porucha spojky potrubia',
      probability: 45,
      estimatedHours: 2,
      estimatedMaterialCost: 320,
      requiredParts: [
        { name: 'Šróbovací spoj 1/2"', brands: [], qty: 2, unit: 'ks' },
      ],
      procedure: ['Uzavrieť prívod vody', 'Demontovať potrubný spoj', 'Vymeniť spoj'],
    },
  ],
}

const mediumConfidenceDiag: DiagResult = {
  confidence: 'medium',
  categoryCode: 'kotel',
  scenarios: [
    {
      id: 'burner_fault',
      label: 'Porucha horáka',
      probability: 55,
      estimatedHours: 2,
      estimatedMaterialCost: 800,
      requiredParts: [
        { name: 'Horák Vaillant VUW', brands: ['Vaillant'], qty: 1, unit: 'ks' },
      ],
      procedure: ['Diagnostika kotla', 'Kontrola chybových kódov', 'Výmena horáka'],
    },
  ],
}

const meta = {
  title: 'Dispatch/DiagnosticBrainCard',
  component: DiagnosticBrainCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Karta diagnostického AI mozgu pre technika. Zobrazuje top diagnostické scenáre s pravdepodobnosťami, odhadovanou dobou práce, potrebnými dielmi a krokovým postupom. Farebné indikátory confidence (zelená/žltá/červená). Rozbalenie postupu cez toggle.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiagnosticBrainCard>

export default meta
type Story = StoryObj<typeof meta>

export const HighConfidence: Story = {
  name: 'Vysoká spoľahlivosť — plumber',
  args: { diagResult: highConfidenceDiag },
}

export const MediumConfidence: Story = {
  name: 'Stredná spoľahlivosť — kotol',
  args: { diagResult: mediumConfidenceDiag },
}

export const NoResult: Story = {
  name: 'Žiadna diagnostika',
  args: { diagResult: null },
}
