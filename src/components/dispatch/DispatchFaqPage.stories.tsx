import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const Placeholder = () => (
  <div style={{
    padding: 32,
    background: 'var(--w, #fff)',
    borderRadius: 12,
    border: '2px dashed var(--g6, #D1D5DB)',
    textAlign: 'center',
    color: 'var(--g4, #6B7280)',
    fontFamily: "'Montserrat', sans-serif",
    lineHeight: 1.6,
  }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      DispatchFaqPage
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      FAQ stránka pre technických pracovníkov v dispatch aplikácii. Obsahuje sekcie: Ako prijať zákazku,
      Ako odoslať protokol, Platobné informácie, Technické problémy a ďalšie. Statický obsah bez API závislosí.
      Dostupné na <code>/dispatch/faq</code>.
    </div>
  </div>
)

const meta = {
  title: 'Dispatch/DispatchFaqPage',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Celostránkový FAQ pre technických pracovníkov. Statický obsah s otázkami a odpoveďami zorganizoví do sekcií. Nezávisí od API ani auth. Dostupné na /dispatch/faq.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
