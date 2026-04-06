import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CustomFieldDefinitionsManager from './CustomFieldDefinitionsManager'

const meta = {
  title: 'Admin/Settings/CustomFieldDefinitionsManager',
  component: CustomFieldDefinitionsManager,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Správca definícií vlastných polí pre entity (job, partner, technician). Umožňuje pridávať, editovať, mazať a zoraďovať vlastné polia. Typy polí: text, number, date, boolean, select, multiselect, textarea, email, phone, url. Načítava z /api/custom-fields?entity=.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 900, padding: 24, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomFieldDefinitionsManager>

export default meta
type Story = StoryObj<typeof meta>

export const JobFields: Story = {
  name: 'Vlastné polia zákazky',
  args: { entityType: 'job' },
}

export const TechnicianFields: Story = {
  name: 'Vlastné polia technika',
  args: { entityType: 'technician' },
}

export const PartnerFields: Story = {
  name: 'Vlastné polia partnera',
  args: { entityType: 'partner' },
}
