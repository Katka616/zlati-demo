import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import DiagnosticDetails from './DiagnosticDetails'
import type { DiagData } from '@/types/diagnostic'

const fullDiagData: DiagData = {
  faultType: 'vodoinstalater',
  urgencyLevel: 'kritická',
  propertyType: 'byt',
  problemDescription: 'Prasklé potrubie pod kuchynským drezom — voda steká na podlahu. Voda privádzaná z hlavného ventilu do kuchyne.',
  additionalNotes: 'Zákazník uzavrel hlavný uzáver. Môžeme otočiť čiastočne ventil.',
  photos: [],
  appointmentSlots: [
    { date: '2026-03-19', time: '08:00', period: 'morning' },
    { date: '2026-03-19', time: '13:00', period: 'afternoon' },
  ],
  insuranceNumber: 'POL-2026-445566',
  claimNumber: 'CLM-88123',
}

const minimalDiagData: DiagData = {
  faultType: 'kotel',
  urgencyLevel: 'vysoká',
  propertyType: 'dum',
  problemDescription: 'Kotol Vaillant VUW nespúšťa. Chybový kód F.75.',
  additionalNotes: null,
  photos: [],
  appointmentSlots: [],
}

const meta = {
  title: 'Dispatch/DiagnosticDetails',
  component: DiagnosticDetails,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zobrazenie kompletných diagnostických dát zákazky. Použité v MarketplaceJobCard (pre rozhodnutie pred prijatím) a v ExpandableJobCard (po prijatí). Zobrazuje typ poruchy, urgentnosť, typ nehnuteľnosti, popis problému a voliteľné termíny.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiagnosticDetails>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {
  name: 'Plné diagnostické dáta',
  args: { diagData: fullDiagData },
}

export const Minimal: Story = {
  name: 'Minimálne dáta',
  args: { diagData: minimalDiagData },
}
