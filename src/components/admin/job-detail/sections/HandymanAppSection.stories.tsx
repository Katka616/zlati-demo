import type { Meta, StoryObj } from '@storybook/nextjs-vite'

/**
 * Documentation-only story for HandymanAppSection.
 * The component is ~800+ lines and has deep dependencies on live API calls,
 * settlement data, and multi-modal photo upload. It is best demonstrated in
 * the running application at /admin/jobs/[id].
 */

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
    <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      HandymanAppSection
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Táto sekcia obsahuje kompletný technicko-operatívny prehľad zákazky: stav TechApp, aktívna fáza, fotografie,
      diagnostika, protokoly, vyúčtovanie, faktúry a opravná verifikácia. Má 800+ riadkov a závisí od živých API
      volaní — zobrazí sa pri otvorení zákazky v admin CRM (<code>/admin/jobs/[id]</code>).
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['TechPhase badge', 'Fotografie (before/after)', 'Diagnostický report', 'Protokol PDF', 'Vyúčtovanie', 'AI verifikácia opravy'].map(f => (
        <span key={f} style={{ background: 'var(--gold-light, #FEF3C7)', color: 'var(--gold-dark, #92400E)', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/JobDetail/HandymanAppSection',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'HandymanAppSection je ústredná sekcia technickej časti detailu zákazky. Zobrazuje tech fázu zákazky, fotografie (before/after), diagnostický AI report, protokoly, vyúčtovanie technika a výsledky AI verifikácie opravy. Kvôli komplexnosti (800+ riadkov, live API) je dokumentovaná ako placeholder — pozrite reálnu implementáciu v `/admin/jobs/[id]`.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = {
  name: 'Dokumentácia',
}
