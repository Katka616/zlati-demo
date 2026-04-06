import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import InvoiceFormModal from './InvoiceFormModal'

const meta = {
  title: 'Dispatch/InvoiceFormModal',
  component: InvoiceFormModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Formulár pre generovanie faktúry systémom (Cesta A). Načítava fakturačné dáta technika a preview faktúry z API. Technik vyplní dáta dodávateľa, číslo faktúry, dátum, DPH sadzbu (21%, 12%, 0%). Vygeneruje PDF faktúru cez html2pdf.js a odošle na server.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    jobId: '88',
    onSuccess: fn(),
    onCancel: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
} satisfies Meta<typeof InvoiceFormModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Generovanie faktúry (live API)',
}
