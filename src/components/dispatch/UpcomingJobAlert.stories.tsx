import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import UpcomingJobAlert from './UpcomingJobAlert'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '55',
  name: 'ZR-2026-CZ-0055',
  referenceNumber: 'ZR-2026-CZ-0055',
  insurance: 'Europ Assistance',
  category: '10. Electrician',
  customerAddress: 'Lidická 22',
  customerCity: 'Brno',
  customerName: 'Zuzana Horáčková',
  customerPhone: '+420 608 222 333',
  urgency: 'normal',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'naplanovane',
  crmStep: 2,
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: new Date(Date.now() + 45 * 60 * 1000).toTimeString().slice(0, 5),
}

const meta = {
  title: 'Dispatch/UpcomingJobAlert',
  component: UpcomingJobAlert,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Alert pre technika keď je naplánovaná zákazka 30–90 minút pred začiatkom. Pýta sa: (1) Prídeš načas? → ak nie, zadá oneskorenie v minútach; (2) Máš všetok materiál? → Áno/Nie. Výsledky sa uložia do custom_fields zákazky a notifikujú CRM + zákazníka.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    onDismiss: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpcomingJobAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Nadchádzajúca zákazka — 45 minút',
  args: { job: baseJob },
}

export const Slovak: Story = {
  name: 'SK jazyk',
  args: { job: baseJob, lang: 'sk' },
}
