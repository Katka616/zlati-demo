import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobsBulkBar from './JobsBulkBar'

const mockTechnicians = [
  { id: 1, first_name: 'Michal', last_name: 'Novák' },
  { id: 2, first_name: 'Peter', last_name: 'Kováč' },
  { id: 3, first_name: 'Tomáš', last_name: 'Horák' },
]

const meta: Meta<typeof JobsBulkBar> = {
  title: 'Admin/Jobs/JobsBulkBar',
  component: JobsBulkBar,
  parameters: {
    docs: {
      description: {
        component:
          'Plávajúci panel pre hromadné akcie nad vybranými zákazkami. Zobrazuje sa len keď je aspoň 1 zákazka vybraná. Umožňuje zmenu stavu, urgentnosti, priradenie technika a archiváciu. Zobrazuje výsledok akcie (success/error feedback).',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof JobsBulkBar>

export const Default: Story = {
  name: 'Vybrané 3 zákazky',
  args: {
    selectedCount: 3,
    technicians: mockTechnicians,
    processing: false,
    feedback: null,
    onBulkUpdate: (field, value) => console.log('Bulk update:', field, value),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const WithSuccessFeedback: Story = {
  name: 'Po úspešnej akcii',
  args: {
    selectedCount: 5,
    technicians: mockTechnicians,
    processing: false,
    feedback: { type: 'success', message: 'Zákazky aktualizované' },
    onBulkUpdate: (field, value) => console.log('Bulk update:', field, value),
    onClearSelection: () => console.log('Clear selection'),
  },
}

export const Processing: Story = {
  name: 'Spracovávanie akcie',
  args: {
    selectedCount: 2,
    technicians: mockTechnicians,
    processing: true,
    feedback: null,
    onBulkUpdate: () => {},
    onClearSelection: () => {},
  },
}
