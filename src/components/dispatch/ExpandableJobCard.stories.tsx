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
    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      ExpandableJobCard
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Rozbaľovacia karta zákazky v <code>/dispatch/my-jobs</code> (1000+ riadkov). Zobrazuje
      zákazku v dvoch stavoch: zbalená (základné info) a rozbalená (kompletné diagnostické dáta,
      fotky, historia stavov, akcie). Závisí od live dát — zobrazí sa v časti "Moje zákazky".
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['Stav zákazky', 'Diagnostické dáta', 'Fotky', 'História stavov', 'Rýchle akcie'].map(f => (
        <span key={f} style={{ background: '#ECFDF5', color: '#065F46', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {f}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Dispatch/ExpandableJobCard',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ExpandableJobCard je rozbaľovacia karta zákazky v zozname "Moje zákazky" technika. 1000+ riadkov. Zbalená zobrazuje základné info; rozbalená zobrazuje kompletné dáta zákazky, diagnostiku, fotky a históriu. Pre plnú funkčnosť vyžaduje live API a auth.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
