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
    <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      ActiveJobFullscreen
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Celostránkové zobrazenie aktívnej zákazky pre technika (1600+ riadkov).
      Smart Button na základe aktuálnej tech fázy, fotky, diagnostika, odhad, protokol,
      vyúčtovanie. Centrálna obrazovka dispatch aplikácie. Najlepšie viditeľné na
      <code>/dispatch/job</code> počas aktívnej zákazky.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Smart Button', 'Foto upload', 'Diagnostika', 'Odhad ceny', 'Protokol', 'Vyúčtovanie', 'GPS tracking'].map(f => (
        <span key={f} style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Dispatch/ActiveJobFullscreen',
  component: Placeholder,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'ActiveJobFullscreen je najväčší komponent v dispatch aplikácii (1600+ riadkov). Zobrazuje aktívnu zákazku s kontextovým Smart Button ktorý sa mení podľa tech fázy. Obsahuje fotoprílohy, diagnostiku, odhad ceny, protokol, vyúčtovanie a GPS tracking. Pre plnú funkčnosť vyžaduje auth kontext a live API.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
