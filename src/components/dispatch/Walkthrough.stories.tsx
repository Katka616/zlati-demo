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
    <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      Walkthrough (Dispatch)
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Interaktívny tutoriál pre technikov v dispatch aplikácii. Overlay s spotlight výrezom nad
      cieľovým DOM elementom a tooltip s návodom. Kroky sú definované v <code>helpContent.ts</code>
      per stránka (marketplace, my-jobs, job, protocol). Spúšťa sa automaticky alebo cez HelpTip.
      Závisí od usePathname hooku — zobrazí sa len na správnych stránkach.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Spotlight', 'Tooltip', 'Krok 1/N', 'Preskočiť', 'localStorage', 'Per technik/stránka'].map(f => (
        <span key={f} style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Dispatch/Walkthrough',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Walkthrough je interaktívny tutoriál pre dispatch aplikáciu. Zobrazuje overlay so spotlight výrezom nad elementmi s atribútom data-walkthrough. Kroky sú definované v src/data/helpContent.ts. Závisí od usePathname — musí byť v kontexte Next.js Router.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
