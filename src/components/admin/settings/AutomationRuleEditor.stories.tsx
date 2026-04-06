import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AutomationRuleEditor from './AutomationRuleEditor'
import type { AutomationRule } from '@/types/automation'

const newRule: AutomationRule = {
  id: 0,
  name: '',
  triggerType: 'job_created',
  triggerConfig: {},
  conditions: [],
  actions: [],
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const existingRule: AutomationRule = {
  id: 5,
  name: 'Notifikácia pri urgentnej zákazke',
  triggerType: 'job_created',
  triggerConfig: {},
  conditions: [
    { id: '1', logic: 'AND', field: 'urgency', operator: 'eq', value: 'acute' },
  ],
  actions: [
    { type: 'send_push', config: { recipient: 'operator', title: 'Urgentná zákazka!', body: '{{job.customer_name}} — {{job.category}} ({{job.customer_city}})' } },
    { type: 'send_sms', config: { recipient: 'technician', message: 'Nová urgentná zákazka: {{job.reference_number}}' } },
  ],
  isActive: true,
  createdAt: '2026-03-10T10:00:00Z',
  updatedAt: '2026-03-15T14:00:00Z',
}

const meta = {
  title: 'Admin/Settings/AutomationRuleEditor',
  component: AutomationRuleEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Editor automatizačného pravidla. Obsahuje: názov, TriggerSelector (kedy sa spustí), podmienky (AND/OR), zoznam akcií (ActionBuilder) a tlačidlá uložiť/zrušiť. Podporuje presets — preddefinované šablóny pravidiel (urgentná zákazka, omeškaná zákazka, odhláška EA).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSave: fn().mockResolvedValue(undefined),
    onCancel: fn(),
    onSaved: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 800, padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AutomationRuleEditor>

export default meta
type Story = StoryObj<typeof meta>

export const NewRule: Story = {
  name: 'Nové pravidlo',
  args: { rule: newRule },
}

export const ExistingRule: Story = {
  name: 'Editácia existujúceho pravidla',
  args: { rule: existingRule },
}
