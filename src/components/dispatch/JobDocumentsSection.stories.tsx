import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobDocumentsSection from './JobDocumentsSection'

const meta = {
  title: 'Dispatch/JobDocumentsSection',
  component: JobDocumentsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia dokumentov zákazky v dispatch app. Zobrazuje fotky, protokoly a faktúry k zákazke. Lazy-load — načíta dokumenty len keď je viditeľná (isVisible=true). Fotky zobrazuje ako miniatúry. Protokoly a faktúry sú na stiahnutie vo formáte PDF.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    jobId: '42',
    lang: 'cz',
    isVisible: true,
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    isVisible: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JobDocumentsSection>

export default meta
type Story = StoryObj<typeof meta>

export const Visible: Story = {
  name: 'Viditeľná — načítava dokumenty',
  args: { isVisible: true, jobId: '42' },
}

export const Hidden: Story = {
  name: 'Skrytá — nestahuje dáta',
  args: { isVisible: false, jobId: '42' },
}
