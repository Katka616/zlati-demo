import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PortalPushBanner from './PortalPushBanner'

const meta: Meta<typeof PortalPushBanner> = {
  title: 'Portal/PortalPushBanner',
  component: PortalPushBanner,
  parameters: {
    docs: {
      description: {
        component:
          'Banner pre povolenie push notifikácií na portáli klienta. Zobrazuje stav podľa Notification.permission a zariadenia. Má 5 stavov: hidden, ios_pwa_hint, request, denied, loading.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalPushBanner>

// Default — request permission (CZ)
export const Default: Story = {
  name: 'Výzva na povolenie notifikácií (CZ)',
  args: { token: 'demo-token-abc123', lang: 'cz' },
  render: (args) => {
    // Simulate bannerState = 'request' by rendering the component's output directly
    return (
      <div style={{ maxWidth: 480, fontFamily: 'Montserrat, sans-serif' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            background: 'linear-gradient(135deg, var(--g1, #fffdf5) 0%, #fef9ec 100%)',
            borderBottom: '1px solid var(--gold, #D4A843)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxSizing: 'border-box',
          }}
          role="banner"
        >
          <button
            style={{
              position: 'absolute', top: '8px', right: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '18px', color: 'var(--g4, #999)', lineHeight: 1, padding: '2px 4px',
            }}
          >
            ×
          </button>
          <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--dark, #1a1a1a)', marginBottom: '2px' }}>
              Dostávejte aktualizace o zakázce
            </div>
            <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--g4, #666)', lineHeight: '1.4' }}>
              Upozorníme vás, když technik vyrazí, dorazí nebo když nastane změna stavu zakázky.
            </div>
            <button
              style={{
                display: 'inline-block', marginTop: '8px',
                background: 'var(--gold, #D4A843)', color: '#fff',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '13px',
                border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer',
              }}
            >
              Povolit upozornění
            </button>
          </div>
        </div>
      </div>
    )
  },
}

// Denied state
export const Denied: Story = {
  name: 'Notifikácie zablokované',
  args: { token: 'demo-token-abc123', lang: 'sk' },
  render: () => (
    <div style={{ maxWidth: 480, fontFamily: 'Montserrat, sans-serif' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'linear-gradient(135deg, var(--g1, #fffdf5) 0%, #fef9ec 100%)',
          borderBottom: '1px solid var(--gold, #D4A843)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxSizing: 'border-box',
        }}
        role="banner"
      >
        <button
          style={{
            position: 'absolute', top: '8px', right: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', color: 'var(--g4, #999)', lineHeight: 1, padding: '2px 4px',
          }}
        >
          ×
        </button>
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>🔕</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--dark, #1a1a1a)', marginBottom: '2px' }}>
            Notifikácie sú zablokované
          </div>
          <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--g4, #666)', lineHeight: '1.4' }}>
            Upozornenia sú vypnuté v nastaveniach prehliadača. Povolíte ich v Nastaveniach → Súkromie → Notifikácie.
          </div>
        </div>
      </div>
    </div>
  ),
}

// iOS PWA hint state
export const IosPwaHint: Story = {
  name: 'iOS — návod na inštaláciu PWA',
  args: { token: 'demo-token-abc123', lang: 'cz' },
  render: () => (
    <div style={{ maxWidth: 480, fontFamily: 'Montserrat, sans-serif' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'linear-gradient(135deg, var(--g1, #fffdf5) 0%, #fef9ec 100%)',
          borderBottom: '1px solid var(--gold, #D4A843)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxSizing: 'border-box',
        }}
        role="banner"
      >
        <button
          style={{
            position: 'absolute', top: '8px', right: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', color: 'var(--g4, #999)', lineHeight: 1, padding: '2px 4px',
          }}
        >
          ×
        </button>
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>📲</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--dark, #1a1a1a)', marginBottom: '2px' }}>
            Přidejte stránku na domovskou obrazovku
          </div>
          <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--g4, #666)', lineHeight: '1.4' }}>
            Pro push upozornění na iPhone/iPad: klepněte na{' '}
            <strong style={{ color: 'var(--dark, #1a1a1a)' }}>Sdílet</strong>{' '}
            (ikona se šipkou) a vyberte{' '}
            <strong style={{ color: 'var(--dark, #1a1a1a)' }}>Přidat na plochu</strong>.
            Poté otevřete zakázku z plochy.
          </div>
        </div>
      </div>
    </div>
  ),
}
