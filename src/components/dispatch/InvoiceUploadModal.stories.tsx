import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import InvoiceUploadModal from './InvoiceUploadModal'

const meta = {
  title: 'Dispatch/InvoiceUploadModal',
  component: InvoiceUploadModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre nahratie vlastnej faktúry technikom (Cesta B). Zobrazuje preview položiek vyúčtovania, výber DPH sadzby, editáciu dát dodávateľa, potvrdzovacie checkboxy a upload PDF/obrázka faktúry. Submit vytvorí faktúru v DB a nahrá súbor.',
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
} satisfies Meta<typeof InvoiceUploadModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Upload vlastnej faktúry (live API)',
}
