import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SLADeadline from './SLADeadline'

const meta: Meta<typeof SLADeadline> = {
  title: 'Admin/SLADeadline',
  component: SLADeadline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sidebar widget s živým odpočtom do SLA limitu. Počíta sa od dátumu vytvorenia zákazky + limitHours hodín. Zobrazuje farebný stav: OK (zelená > 50%), varovanie (žltá 15–50%), kritické (červená < 15%).',
      },
    },
  },
  argTypes: {
    limitHours: { control: { type: 'range', min: 1, max: 72 } },
  },
}

export default meta
type Story = StoryObj<typeof SLADeadline>

// Helper: datetime offset from now
function hoursFromNow(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString()
}

export const Comfortable: Story = {
  name: 'Komfortná zóna (>50%)',
  args: {
    createdAt: hoursFromNow(4),
    limitHours: 24,
  },
}

export const Warning: Story = {
  name: 'Varovanie (15–50%)',
  args: {
    createdAt: hoursFromNow(18),
    limitHours: 24,
  },
}

export const Critical: Story = {
  name: 'Kritické (<15%)',
  args: {
    createdAt: hoursFromNow(23),
    limitHours: 24,
  },
}

export const Expired: Story = {
  name: 'Vypršané',
  args: {
    createdAt: hoursFromNow(26),
    limitHours: 24,
  },
}

export const ShortLimit: Story = {
  name: 'Krátky 4h limit',
  args: {
    createdAt: hoursFromNow(2),
    limitHours: 4,
  },
}
