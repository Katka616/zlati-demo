import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import MaterialChecklistModal from './MaterialChecklistModal'

const plumbingParts = [
  {
    name: 'Kartuša termostatická DN15',
    qty: 1,
    unit: 'ks',
    brands: ['Grohe', 'Hansgrohe', 'Ideal Standard'],
    suggestedPayer: 'pojistovna' as const,
    coverageReason: 'Hradí poisťovňa v rámci havarijného poistenia',
  },
  {
    name: 'Tesnenie gumové 3/4"',
    qty: 4,
    unit: 'ks',
    brands: ['Signum', 'Wavin'],
    suggestedPayer: 'klient' as const,
    coverageReason: 'Bežná údržba — mimo rozsahu poistenia',
  },
  {
    name: 'Flexibilná hadička 40cm',
    qty: 2,
    unit: 'ks',
    brands: ['Baumit'],
    suggestedPayer: 'pojistovna' as const,
  },
  {
    name: 'Silikón sanitárny biely',
    qty: 1,
    unit: 'tuba',
    suggestedPayer: 'klient' as const,
  },
]

const electricalParts = [
  {
    name: 'Poistka 16A typ B',
    qty: 3,
    unit: 'ks',
    brands: ['Hager', 'ABB', 'OEZ'],
    suggestedPayer: 'pojistovna' as const,
  },
  {
    name: 'Kábel NYM-J 3×2,5',
    qty: 5,
    unit: 'm',
    suggestedPayer: 'pojistovna' as const,
  },
]

const meta = {
  title: 'Dispatch/MaterialChecklistModal',
  component: MaterialChecklistModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modál pre kontrolu dostupnosti materiálu pred odchodom na zákazku. Technik si odškrtí, čo má pripravené. Ak niečo chýba, zobrazí sa textové pole pre poznámku. Poisťovňou hradené položky sú označené zeleným badge "Poisťovňa", klientom hradené oranžovým "Klient".',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onConfirm: { action: 'confirmed' },
    onClose: { action: 'closed' },
  },
  args: {
    onConfirm: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.5)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MaterialChecklistModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Inštalatér — 4 položky so platcami',
  args: {
    parts: plumbingParts,
  },
}

export const Electrical: Story = {
  name: 'Elektrikár — 2 položky',
  args: {
    parts: electricalParts,
  },
}

export const EmptyList: Story = {
  name: 'Bez odporúčaného materiálu',
  args: {
    parts: [],
  },
}
