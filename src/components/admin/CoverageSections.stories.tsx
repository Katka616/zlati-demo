import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CoverageSections from './CoverageSections'
import type { CoverageBreakdown } from '@/data/mockData'

const meta: Meta<typeof CoverageSections> = {
  title: 'Admin/CoverageSections',
  component: CoverageSections,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zobrazenie krytia poisťovňou — rozdelenie nákladov do kategórií: POOL poisťovne (kryté), vylúčené položky a nekryté náklady. Zobrazuje progress bar využitia limitu s farebnou signalizáciou (zelená/oranžová/červená).',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof CoverageSections>

const fmt = (cents: number) => `${(cents / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 0 })} Kč`

const mockBreakdown: CoverageBreakdown = {
  sharedLimit: 500000,
  sharedUsed: 187100,
  categories: [
    { label: 'Práca (1. hodina)', status: 'in_pool', used: 89000, note: null },
    { label: 'Práca (ďalšie hodiny)', status: 'in_pool', used: 44500, note: null },
    { label: 'Cestovné', status: 'in_pool', used: 22400, note: null },
    { label: 'Drobný materiál', status: 'in_pool', used: 31200, note: null },
    { label: 'Náhradné diely', status: 'excluded', used: 0, note: 'Len po schválení EA' },
    { label: 'Doplatok klienta', status: 'not_covered', used: 35000, note: null },
  ],
}

export const Normal: Story = {
  name: 'Normálne využitie (37%)',
  args: {
    cb: mockBreakdown,
    fmt,
  },
}

export const NearLimit: Story = {
  name: 'Blízko limitu (85%)',
  args: {
    cb: {
      ...mockBreakdown,
      sharedUsed: 425000,
    },
    fmt,
  },
}

export const OverLimit: Story = {
  name: 'Prekročený limit',
  args: {
    cb: {
      ...mockBreakdown,
      sharedUsed: 580000,
    },
    fmt,
  },
}

export const OnlyPool: Story = {
  name: 'Len pool kategórie',
  args: {
    cb: {
      sharedLimit: 300000,
      sharedUsed: 120000,
      categories: [
        { label: 'Práca', status: 'in_pool', used: 89000, note: null },
        { label: 'Cestovné', status: 'in_pool', used: 31000, note: null },
      ],
    },
    fmt,
  },
}
