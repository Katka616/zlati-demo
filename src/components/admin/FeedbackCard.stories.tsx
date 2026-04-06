import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta = {
  title: 'Admin/FeedbackCard',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard karta zobrazujúca spätnú väzbu od technikov. Auto-skryje sa ak neexistuje žiadny feedback. Zobrazuje meno technika, timestamp a text správy.',
      },
    },
  },
}

export default meta
type Story = StoryObj

interface FeedbackRow {
  id: number
  message: string
  category: string
  created_at: string
  first_name: string
  last_name: string
  phone: string
}

function FeedbackCardMock({ feedback }: { feedback: FeedbackRow[] }) {
  if (feedback.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--g4, #4B5563)', fontSize: 13 }}>
        (Karta je skrytá — žiadny feedback)
      </div>
    )
  }

  const count = feedback.length
  const countLabel = count === 1 ? 'návrh' : count < 5 ? 'návrhy' : 'návrhov'

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border, #E5E5E5)',
        borderRadius: 14,
        padding: '20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>
            Feedback od technikov
          </h3>
          <span style={{ fontSize: 12, color: 'var(--g4, #4B5563)', fontWeight: 500 }}>
            {count} {countLabel}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
          {feedback.map(fb => (
            <div key={fb.id} style={{
              padding: '12px 14px',
              background: 'var(--bg, #fafaf7)',
              borderRadius: 10,
              border: '1px solid var(--g8, #f3f4f6)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                  {fb.first_name} {fb.last_name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--g5, #9ca3af)' }}>
                  {new Date(fb.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #4B5563)', lineHeight: 1.5 }}>
                {fb.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const mockFeedback: FeedbackRow[] = [
  {
    id: 1,
    message: 'Bolo by super keby som mohol pridávať fotky materiálu priamo z galérie, nie len cez fotoaparát.',
    category: 'feature',
    created_at: '2026-03-31T08:45:00',
    first_name: 'Marek',
    last_name: 'Novák',
    phone: '+421 911 123 456',
  },
  {
    id: 2,
    message: 'Aplikácia mi spadla pri ukladaní protokolu dvakrát za sebou. Nabudúce to skúsim znova, ale bolo to frustrujúce.',
    category: 'bug',
    created_at: '2026-03-30T16:20:00',
    first_name: 'Ján',
    last_name: 'Horváth',
    phone: '+421 905 234 567',
  },
  {
    id: 3,
    message: 'Ceny materiálu v zozname sú už zastaralé — silikón DN 40 stojí teraz 8,50 Kč, nie 6 Kč.',
    category: 'pricing',
    created_at: '2026-03-29T11:10:00',
    first_name: 'Peter',
    last_name: 'Kováč',
    phone: '+421 902 345 678',
  },
]

export const Default: Story = {
  name: '3 nové feedbacky',
  render: () => <FeedbackCardMock feedback={mockFeedback} />,
}

export const SingleFeedback: Story = {
  name: '1 návrh',
  render: () => <FeedbackCardMock feedback={[mockFeedback[0]]} />,
}

export const Empty: Story = {
  name: 'Žiadny feedback (karta skrytá)',
  render: () => <FeedbackCardMock feedback={[]} />,
}
