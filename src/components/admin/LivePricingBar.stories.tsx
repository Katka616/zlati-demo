import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import LivePricingBar from './LivePricingBar'

const meta: Meta<typeof LivePricingBar> = {
  title: 'Admin/LivePricingBar',
  component: LivePricingBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Kompaktná lišta zobrazujúca live kalkuláciu zákazky v reálnom čase — porovnáva odhad vs. reálne hodnoty (hodiny, km, poisťovňa, marža). Polluje API každých 20 minút. Farebné indikátory: zelená = v poriadku, červená = prekročené.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LivePricingBar>

/**
 * LivePricingBar fetches its own data, so stories render a static visual
 * approximation using the same CSS classes the component uses.
 */

function StaticLivePricingBar({
  alertLevel = 'ok',
  surcharge = 0,
  hoursOk = true,
  kmOk = true,
  marginMet = true,
}: {
  alertLevel?: 'ok' | 'warning' | 'danger'
  surcharge?: number
  hoursOk?: boolean
  kmOk?: boolean
  marginMet?: boolean
}) {
  const badgeCls = alertLevel === 'danger' ? 'lpb-badge-red' : alertLevel === 'warning' ? 'lpb-badge-orange' : 'lpb-badge-green'
  const badgeText = alertLevel === 'ok' ? 'Podľa odhadu' : alertLevel === 'warning' ? '+18% nad odhad' : '+45% nad odhad'
  const okColor = 'var(--success-text, #22c55e)'
  const errColor = 'var(--danger-text, #ef4444)'

  return (
    <div className="lpb-container" style={{ background: 'var(--w, #fff)', borderRadius: 8, padding: '8px 14px', border: '1px solid var(--border, #E5E5E5)' }}>
      <div className="lpb-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: alertLevel === 'danger' ? errColor : alertLevel === 'warning' ? 'var(--warning-text, #f59e0b)' : okColor, display: 'inline-block', marginRight: 8 }} />

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Hodiny</span>
        <div className="lpb-values" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="lpb-est" style={{ fontSize: 11, color: 'var(--g4, #4B5563)', textDecoration: 'line-through' }}>2.0h</span>
          <span className="lpb-live" style={{ fontSize: 12, fontWeight: 700, color: hoursOk ? okColor : errColor }}>
            {hoursOk ? '1.5h' : '3.5h'}
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: hoursOk ? okColor : errColor }} />
          </span>
        </div>
      </div>

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Km</span>
        <div className="lpb-values" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="lpb-est" style={{ fontSize: 11, color: 'var(--g4, #4B5563)', textDecoration: 'line-through' }}>30</span>
          <span className="lpb-live" style={{ fontSize: 12, fontWeight: 700, color: kmOk ? okColor : errColor }}>
            {kmOk ? '28' : '52'}
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: kmOk ? okColor : errColor }} />
          </span>
        </div>
      </div>

      <div style={{ display: 'inline-block', width: 1, height: 28, background: 'var(--g8, #f3f4f6)', margin: '0 12px 0 0', verticalAlign: 'middle' }} />

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Poisťovňa</span>
        <div className="lpb-values">
          <span style={{ fontSize: 12, fontWeight: 700, color: okColor }}>1 376 Kč <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: okColor }} /></span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>z 15 000 Kč</span>
      </div>

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Materiál</span>
        <div className="lpb-values">
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>437 Kč</span>
        </div>
      </div>

      <div style={{ display: 'inline-block', width: 1, height: 28, background: 'var(--g8, #f3f4f6)', margin: '0 12px 0 0', verticalAlign: 'middle' }} />

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Platba technikovi</span>
        <div className="lpb-values" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="lpb-est" style={{ fontSize: 11, color: 'var(--g4, #4B5563)', textDecoration: 'line-through' }}>478 Kč</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: okColor }}>358 Kč <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: okColor }} /></span>
        </div>
      </div>

      <div className="lpb-surcharge-cell" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Doplatok klient</span>
        <div style={{ fontSize: 12, fontWeight: 700, color: surcharge > 0 ? 'var(--gold, #D4A843)' : 'var(--g4, #4B5563)' }}>
          {surcharge > 0 ? `${surcharge.toLocaleString('cs-CZ')} Kč` : '—'}
        </div>
      </div>

      <div className="lpb-metric" style={{ display: 'inline-flex', flexDirection: 'column', marginRight: 16 }}>
        <span className="lpb-label" style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>Marža</span>
        <div className="lpb-values">
          <span style={{ fontSize: 12, fontWeight: 700, color: marginMet ? okColor : errColor }}>
            1 698 Kč
            {marginMet
              ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: okColor }} />
              : <span style={{ display: 'inline-block', width: 0, height: 0, marginLeft: 4, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '7px solid var(--warning-text, #f59e0b)' }} />
            }
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--g4, #4B5563)' }}>min 975 Kč</span>
      </div>

      <span className={badgeCls} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: alertLevel === 'danger' ? '#FEE2E2' : alertLevel === 'warning' ? '#FFF3E0' : '#E8F5E9',
        color: alertLevel === 'danger' ? '#991B1B' : alertLevel === 'warning' ? '#92400E' : '#1B5E20',
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
          background: alertLevel === 'danger' ? errColor : alertLevel === 'warning' ? 'var(--warning-text, #f59e0b)' : okColor,
        }} />
        <strong>{badgeText}</strong>
      </span>
    </div>
  )
}

export const Default: Story = {
  name: 'V poriadku — podľa odhadu',
  render: () => (
    <div style={{ padding: 24 }}>
      <StaticLivePricingBar alertLevel="ok" hoursOk={true} kmOk={true} marginMet={true} />
    </div>
  ),
}

export const WithWarning: Story = {
  name: 'Varovanie — mierne prekročenie odhadu',
  render: () => (
    <div style={{ padding: 24 }}>
      <StaticLivePricingBar alertLevel="warning" hoursOk={false} kmOk={true} marginMet={true} surcharge={2500} />
    </div>
  ),
}

export const WithDanger: Story = {
  name: 'Nebezpečenstvo — výrazné prekročenie',
  render: () => (
    <div style={{ padding: 24 }}>
      <StaticLivePricingBar alertLevel="danger" hoursOk={false} kmOk={false} marginMet={false} />
    </div>
  ),
}
