import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import InvoiceDecisionModal from './InvoiceDecisionModal'

const meta = {
  title: 'Dispatch/InvoiceDecisionModal',
  component: InvoiceDecisionModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Prvý krok fakturačného toku pre CZ technnikov. Technik si vyberie: (A) Systémom generovaná faktúra → otvorí InvoiceFormModal, (B) Nahrám vlastnú faktúru → otvorí InvoiceUploadModal. SK technici priamo nahrajú vlastnú faktúru (SkInvoiceUploadModal).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof InvoiceDecisionModal>

export default meta
type Story = StoryObj<typeof meta>

export const Czech: Story = {
  name: 'CZ výber metódy faktúry',
  args: { lang: 'cz' },
}

export const Slovak: Story = {
  name: 'SK výber metódy faktúry',
  args: { lang: 'sk' },
}
