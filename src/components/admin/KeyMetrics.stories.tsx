import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import KeyMetrics from './KeyMetrics'

const meta: Meta<typeof KeyMetrics> = {
  title: 'Admin/KeyMetrics',
  component: KeyMetrics,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sidebar widget s kľúčovými metrikami zákazky. Zobrazuje N metrík v grid rozložení. Každá metrika má hodnotu, popis a voliteľnú farbu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof KeyMetrics>

export const Default: Story = {
  args: {
    metrics: [
      { value: '3.5 h', label: 'Odpracované hodiny' },
      { value: '28 km', label: 'Najazdené km' },
      { value: '2 450 Kč', label: 'Odhadovaná cena' },
      { value: '4/5', label: 'Hodnotenie technika' },
      { value: '14 h', label: 'Čas od prijatia' },
      { value: '2', label: 'Počet návštev' },
    ],
  },
}

export const WithColors: Story = {
  name: 'S farebnými hodnotami',
  args: {
    metrics: [
      { value: '2 450 Kč', label: 'Celková cena', color: '#16A34A' },
      { value: '350 Kč', label: 'Doplatok klient', color: '#EA580C' },
      { value: '22 h', label: 'Čas od otvorenia', color: '#DC2626' },
      { value: '98%', label: 'Krytie poisťovňou', color: '#2563EB' },
    ],
  },
}

export const MinimalMetrics: Story = {
  name: 'Minimálne (2 metriky)',
  args: {
    metrics: [
      { value: '1 h', label: 'Čas práce' },
      { value: '10 km', label: 'Vzdialenosť' },
    ],
  },
}
