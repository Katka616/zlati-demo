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
    <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      RightSidebar
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Pravý panel detailu zákazky — zobrazuje CRM pipeline progress, AI Brain signály, zákazníkovy chatové správy,
      technický postup, timeline udalostí a kartu technika. Je úzko prepojený so živým stavom zákazky
      a vyžaduje auth kontext. Dokumentácia v <code>/admin/jobs/[id]</code>.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['CRM Pipeline', 'AI Brain signals', 'Chat messages', 'Timeline', 'Technik karta', 'Reschedule'].map(s => (
        <span key={s} style={{ background: '#F0FDF4', color: '#166534', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {s}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/JobDetail/RightSidebar',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'RightSidebar je pravý stĺpec admin detailu zákazky. Obsahuje CRM pipeline kroky, AI Brain signály, zákazníkove chatové správy, timeline udalostí a technickú kartu priradeného technika. Pre plnú funkčnosť vyžaduje živý auth kontext a WebSocket/polling dáta.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
