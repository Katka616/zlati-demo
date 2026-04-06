import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DashboardActionList from './DashboardActionList'

const meta = {
  title: 'Dispatch/DashboardActionList',
  component: DashboardActionList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zoznam zákaziek vyžadujúcich akciu na dashboarde technika. Zobrazuje max 5 položiek s farebnými badge variantmi (primary = červená, secondary = oranžová, waiting = modrá). Ak je zákaziek viac, zobrazí sa odkaz "Zobraziť všetky".',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: {
      control: 'radio',
      options: ['sk', 'cz'],
    },
    onJobClick: { action: 'jobClicked' },
    onShowAll: { action: 'showAllClicked' },
  },
  args: {
    lang: 'sk',
    onJobClick: fn(),
    onShowAll: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg, #F7F6F3)', borderRadius: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardActionList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Zmiešané akcie',
  args: {
    jobs: [
      {
        id: '101',
        referenceNumber: 'ZR-2026-0101',
        customerName: 'Ján Kováč',
        customerCity: 'Bratislava',
        actionLabel: 'Podpísať protokol',
        actionVariant: 'primary',
      },
      {
        id: '102',
        referenceNumber: 'ZR-2026-0102',
        customerName: 'Marta Horáková',
        customerCity: 'Trnava',
        actionLabel: 'Nahrať faktúru',
        actionVariant: 'secondary',
      },
      {
        id: '103',
        referenceNumber: 'ZR-2026-0103',
        customerName: 'Pavel Novák',
        customerCity: 'Praha 2',
        actionLabel: 'Čaká na schválenie',
        actionVariant: 'waiting',
      },
    ],
  },
}

export const OnlyPrimary: Story = {
  name: 'Len urgentné akcie (primary)',
  args: {
    jobs: [
      {
        id: '201',
        referenceNumber: 'ZR-2026-0201',
        customerName: 'Eva Blahová',
        customerCity: 'Košice',
        actionLabel: 'Dokončiť protokol',
        actionVariant: 'primary',
      },
      {
        id: '202',
        referenceNumber: 'ZR-2026-0202',
        customerName: 'Miroslav Šimko',
        customerCity: 'Žilina',
        actionLabel: 'Dokončiť protokol',
        actionVariant: 'primary',
      },
    ],
  },
}

export const MoreThanFive: Story = {
  name: 'Viac ako 5 zákaziek — zobrazí "Zobraziť všetky"',
  args: {
    jobs: [
      { id: '301', referenceNumber: 'ZR-2026-0301', customerName: 'Anna Procházková', customerCity: 'Brno', actionLabel: 'Nahrať faktúru', actionVariant: 'secondary' },
      { id: '302', referenceNumber: 'ZR-2026-0302', customerName: 'Juraj Mináč', customerCity: 'Nitra', actionLabel: 'Podpísať protokol', actionVariant: 'primary' },
      { id: '303', referenceNumber: 'ZR-2026-0303', customerName: 'Lucia Fišerová', customerCity: 'Trenčín', actionLabel: 'Čaká na schválenie', actionVariant: 'waiting' },
      { id: '304', referenceNumber: 'ZR-2026-0304', customerName: 'Robert Takáč', customerCity: 'Prešov', actionLabel: 'Nahrať faktúru', actionVariant: 'secondary' },
      { id: '305', referenceNumber: 'ZR-2026-0305', customerName: 'Zuzana Kráľová', customerCity: 'Banská Bystrica', actionLabel: 'Podpísať protokol', actionVariant: 'primary' },
      { id: '306', referenceNumber: 'ZR-2026-0306', customerName: 'Peter Sedlák', customerCity: 'Poprad', actionLabel: 'Čaká na schválenie', actionVariant: 'waiting' },
    ],
  },
}
