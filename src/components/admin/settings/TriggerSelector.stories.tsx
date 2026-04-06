import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import TriggerSelector from './TriggerSelector'
import type { TriggerType, TriggerConfig } from '@/types/automation'

const meta = {
  title: 'Admin/Settings/TriggerSelector',
  component: TriggerSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Selektor triggera automatizačného pravidla. Podporuje triggery: job_created, status_changed, tech_phase_changed, field_changed, time_elapsed, schedule. Pre každý typ zobrazuje relevantné parametre (napr. cieľový status, pole, oneskorenie v minútach).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onTypeChange: fn(),
    onConfigChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, padding: 24, background: 'var(--w, #fff)', border: '1px solid #E5E7EB', borderRadius: 10 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TriggerSelector>

export default meta
type Story = StoryObj<typeof meta>

export const JobCreated: Story = {
  name: 'Trigger: Zákazka vytvorená',
  args: {
    triggerType: 'job_created' as TriggerType,
    triggerConfig: {} as TriggerConfig,
  },
}

export const StatusChanged: Story = {
  name: 'Trigger: Zmena statusu',
  args: {
    triggerType: 'status_changed' as TriggerType,
    triggerConfig: { targetStatus: 'naplanovane' } as TriggerConfig,
  },
}

export const TechPhaseChanged: Story = {
  name: 'Trigger: Zmena tech fázy',
  args: {
    triggerType: 'tech_phase_changed' as TriggerType,
    triggerConfig: { targetPhase: 'en_route' } as TriggerConfig,
  },
}

export const TimeElapsed: Story = {
  name: 'Trigger: Časové oneskorenie',
  args: {
    triggerType: 'time_elapsed' as TriggerType,
    triggerConfig: { delayMinutes: 60, referenceEvent: 'job_created' } as TriggerConfig,
  },
}

export const FieldChanged: Story = {
  name: 'Trigger: Zmena poľa',
  args: {
    triggerType: 'field_changed' as TriggerType,
    triggerConfig: { fieldName: 'urgency' } as TriggerConfig,
  },
}
