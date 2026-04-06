import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import OperatorAssignmentWidget from './OperatorAssignmentWidget'

const meta = {
  title: 'Admin/JobDetail/OperatorAssignmentWidget',
  component: OperatorAssignmentWidget,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Widget na priradenie operátora k zákazke. Zobrazuje odznak s iniciálami a menom aktuálneho operátora. Kliknutím sa otvorí dropdown s vyhľadávaním, tlačidlom automatického priradenia a zoznamom operátorov s afinitnou skórou. API: GET /api/admin/jobs/[id]/operator-matches.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    jobId: 42,
    onAssigned: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OperatorAssignmentWidget>

export default meta
type Story = StoryObj<typeof meta>

export const NoOperator: Story = {
  name: 'Bez operátora',
  args: {
    currentOperatorId: null,
    currentOperatorName: null,
  },
}

export const WithOperator: Story = {
  name: 'Priradený operátor',
  args: {
    currentOperatorId: 1,
    currentOperatorName: 'Katarína Lacínová',
  },
}

export const AnotherOperator: Story = {
  name: 'Iný operátor',
  args: {
    currentOperatorId: 2,
    currentOperatorName: 'Martin Kováč',
  },
}
