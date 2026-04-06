import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import ActionBuilder from './ActionBuilder'
import type { AutomationAction } from '@/types/automation'

const sendSmsAction: AutomationAction = {
  type: 'send_sms',
  config: {
    recipient: 'technician',
    message: 'Zákazka {{job.reference_number}} bola priradená. Zákazník: {{job.customer_name}}, {{job.customer_city}}',
  },
}

const sendPushAction: AutomationAction = {
  type: 'send_push',
  config: {
    recipient: 'operator',
    title: 'Nová urgentná zákazka!',
    body: '{{job.customer_name}} — {{job.category}} ({{job.customer_city}})',
  },
}

const changeStatusAction: AutomationAction = {
  type: 'change_status',
  config: { newStatus: 'naplanovane' },
}

const meta = {
  title: 'Admin/Settings/ActionBuilder',
  component: ActionBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Builder pre akciu automatizačného pravidla. Umožňuje vybrať typ akcie (send_sms, send_push, change_status, set_field, notify_operator, create_reminder, add_note) a nakonfigurovať parametre. Obsahuje VariableChipBar pre vkladanie dynamických premenných do správ.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, padding: 24, background: 'var(--w, #fff)', border: '1px solid #E5E7EB', borderRadius: 10 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionBuilder>

export default meta
type Story = StoryObj<typeof meta>

export const SendSms: Story = {
  name: 'Odoslať SMS technikovi',
  args: { action: sendSmsAction },
}

export const SendPush: Story = {
  name: 'Push notifikácia operátorovi',
  args: { action: sendPushAction },
}

export const ChangeStatus: Story = {
  name: 'Zmeniť status zákazky',
  args: { action: changeStatusAction },
}

export const SetField: Story = {
  name: 'Nastaviť pole zákazky',
  args: {
    action: {
      type: 'set_field',
      config: { field: 'urgency', value: 'urgent' },
    },
  },
}
