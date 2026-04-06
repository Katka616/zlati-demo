import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/test'
import JobsScenarioFilters from './JobsScenarioFilters'

const meta: Meta<typeof JobsScenarioFilters> = {
  title: 'Admin/Jobs/JobsScenarioFilters',
  component: JobsScenarioFilters,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Rýchle scenárové filtre nad zoznamom zákaziek. Umožňuje jednoklikovú filtráciu podľa predvolených scenárov: nepridelené, po termíne, čakajúce na schválenie, dnes naplánované a follow-up zákazky.',
      },
    },
  },
  argTypes: {
    activeScenario: {
      control: { type: 'select' },
      options: [null, 'unassigned', 'overdue', 'waiting_approval', 'today', 'followup'],
    },
    onToggleScenario: { action: 'scenarioToggled' },
  },
}

export default meta
type Story = StoryObj<typeof JobsScenarioFilters>

const mockCounts = {
  unassigned: 8,
  overdue: 3,
  waiting_approval: 5,
  today: 12,
  followup: 2,
}

export const Default: Story = {
  name: 'Predvolené (žiadny aktívny scenár)',
  args: {
    activeScenario: null,
    scenarioCounts: mockCounts,
    onToggleScenario: fn(),
  },
}

export const UnassignedActive: Story = {
  name: 'Aktívny scenár: Nepridelené',
  args: {
    activeScenario: 'unassigned',
    scenarioCounts: mockCounts,
    onToggleScenario: fn(),
  },
}

export const OverdueActive: Story = {
  name: 'Aktívny scenár: Po termíne',
  args: {
    activeScenario: 'overdue',
    scenarioCounts: mockCounts,
    onToggleScenario: fn(),
  },
}

export const WaitingApprovalActive: Story = {
  name: 'Aktívny scenár: Čakajúce na schválenie',
  args: {
    activeScenario: 'waiting_approval',
    scenarioCounts: mockCounts,
    onToggleScenario: fn(),
  },
}

export const ZeroCounts: Story = {
  name: 'Nulové počty (prázdny deň)',
  args: {
    activeScenario: null,
    scenarioCounts: {
      unassigned: 0,
      overdue: 0,
      waiting_approval: 0,
      today: 0,
      followup: 0,
    },
    onToggleScenario: fn(),
  },
}
