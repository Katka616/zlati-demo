import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import WaveFlowDiagram from './WaveFlowDiagram'

const mockPresets = [
  {
    id: 1,
    name: 'Okamžitá notifikácia (Top 3)',
    auto_notify: true,
    auto_notify_trigger: 'job_created',
    auto_notify_delay_minutes: 0,
    auto_notify_top_n: 3,
    fallback_immediate: true,
  },
  {
    id: 2,
    name: 'Po 15 minútach (Top 5)',
    auto_notify: true,
    auto_notify_trigger: 'job_created',
    auto_notify_delay_minutes: 15,
    auto_notify_top_n: 5,
    fallback_immediate: false,
  },
  {
    id: 3,
    name: 'Urgentné — okamžité broadcast',
    auto_notify: true,
    auto_notify_trigger: 'job_created',
    auto_notify_delay_minutes: 0,
    auto_notify_top_n: null,
    fallback_immediate: true,
  },
  {
    id: 4,
    name: 'Po diagnostike (Top 3)',
    auto_notify: true,
    auto_notify_trigger: 'diagnostic_completed',
    auto_notify_delay_minutes: 5,
    auto_notify_top_n: 3,
    fallback_immediate: false,
  },
]

const meta = {
  title: 'Admin/Settings/WaveFlowDiagram',
  component: WaveFlowDiagram,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Vizuálny diagram notifikačných vĺn auto-notify systému. Zobrazuje pipeline pre triggery "job_created" a "diagnostic_completed". Každý uzol je preset s oneskorením a počtom notifikovaných technikov. Kliknutie na uzol vyberie preset v rodičovskom komponente.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    presets: mockPresets,
    selectedPresetId: 1,
    onSelectPreset: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: 'var(--w, #fff)', overflowX: 'auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WaveFlowDiagram>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Diagram notifikačných vĺn',
}

export const SecondSelected: Story = {
  name: 'Vybraný druhý preset',
  args: { selectedPresetId: 2 },
}

export const NoSelection: Story = {
  name: 'Bez výberu',
  args: { selectedPresetId: null },
}
