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
      WalkthroughOverlay
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Interaktívny tutoriál pre admin operátorov — step-by-step sprievodca funkciami CRM.
      Zobrazuje spotlight výrez nad cieľovým DOM elementom (data-walkthrough atribút)
      a tooltip s popisom. Uloženie progress do localStorage (per operátor + per stránka).
      Spúšťa sa automaticky alebo cez WalkthroughTrigger tlačidlo.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Spotlight overlay', 'Tooltip', 'Krok 1/N', 'Preskočiť', 'localStorage uloženie'].map(f => (
        <span key={f} style={{ background: '#F3E8FF', color: '#6B21A8', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/Walkthrough/WalkthroughOverlay',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'WalkthroughOverlay je interaktívny tutoriál nakrytý nad celou stránkou. Zobrazuje tmavý overlay so "spotlight" výrezom nad aktuálnym cieľovým elementom (identifikovaným data-walkthrough atribútom) a tooltip s návodom. Kroky sú definované v walkthroughSteps.ts per stránka/rola.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
