import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import SignaturePad from './SignaturePad'

const meta = {
  title: 'Dispatch/SignaturePad',
  component: SignaturePad,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Plátno pre elektronický podpis technika. Touch + mouse kreslenie so smooth Bézier krivkami. Exportuje base64 PNG bez prefixu. Uložený podpis sa zobrazuje ako náhľad s tlačidlom Zmeniť. Používa sa v profile technika — podpis sa automaticky aplikuje na protokoly.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'sk',
    onSave: fn(),
    onClear: fn(),
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    existingSignature: { control: 'text', description: 'base64 PNG bez data: prefixu' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 16, background: 'var(--w, #fff)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignaturePad>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  name: 'Prázdne plátno — nakresliť podpis',
  args: { existingSignature: null },
}

export const Czech: Story = {
  name: 'CZ jazyk',
  args: { existingSignature: null, lang: 'cz' },
}
