import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import DiagnosticChoiceModal from './DiagnosticChoiceModal'

const meta = {
  title: 'Dispatch/DiagnosticChoiceModal',
  component: DiagnosticChoiceModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Výberový modal po ukončení diagnostiky na mieste. Technik si vyberie medzi: (1) Pokračovať s odhadom ceny → EstimateFormModal, (2) Ukončiť iba diagnostikou → DiagnosticEndModal (napr. zákazník odmietol, zákazka sa nerobí).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onChooseEstimate: fn(),
    onChooseDiagnosticEnd: fn(),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof DiagnosticChoiceModal>

export default meta
type Story = StoryObj<typeof meta>

export const Slovak: Story = {
  name: 'Slovensky',
  args: { lang: 'sk' },
}

export const Czech: Story = {
  name: 'Česky',
  args: { lang: 'cz' },
}
