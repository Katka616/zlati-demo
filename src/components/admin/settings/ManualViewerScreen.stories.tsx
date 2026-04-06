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
    <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      ManualViewerScreen
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Systémová príručka Zlatí Řemeslníci. Zobrazuje HTML príručku cez auth-chránený iframe z
      <code>/api/admin/manual</code>. Obsah je statický HTML dokument s kompletnou dokumentáciou
      systému pre operátorov. Vyžaduje auth kontext (operator JWT) pre načítanie.
    </div>
    <div style={{ marginTop: 20, padding: '12px 20px', background: '#F9FAFB', borderRadius: 8, display: 'inline-block', fontSize: 13 }}>
      Route: <strong>/admin/settings/manual</strong>
    </div>
  </div>
)

const meta = {
  title: 'Admin/Settings/ManualViewerScreen',
  component: Placeholder,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Jednoduchý viewer systémovej príručky. Renderuje iframe s HTML príručkou cez auth-chránený API endpoint. Príručka obsahuje dokumentáciu všetkých procesov, rolí a funkcií pre operátorov.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
