import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import WhatsAppQRModal from './WhatsAppQRModal'

const meta: Meta<typeof WhatsAppQRModal> = {
  title: 'Admin/WhatsAppQRModal',
  component: WhatsAppQRModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre pripojenie WhatsApp cez QR kód. Automaticky generuje QR, polluje stav pripojenia každé 2 sekundy. Zobrazuje tri stavy: generovanie QR, úspešné pripojenie, chyba.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof WhatsAppQRModal>

export const Default: Story = {
  name: 'Čaká na QR kód',
  render: () => (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f5f5f2' }}>
      {/* Simulate the loading state — modal renders over backdrop */}
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            Pripojiť WhatsApp
          </h3>
          <p style={{ fontSize: 13, color: 'var(--g4, #4B5563)', margin: '0 0 20px' }}>
            Naskenujte QR kód aplikáciou WhatsApp na telefóne.
          </p>
          <div style={{
            padding: '40px 0',
            color: 'var(--g4, #4B5563)',
            fontSize: 13,
          }}>
            Generujem QR kód...
          </div>
          <div>
            <button
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--g6, #D0D0D0)', background: 'var(--w, #FFF)',
                color: 'var(--dark, #1a1a1a)', cursor: 'pointer',
              }}
            >
              Zrušiť
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const WithQRCode: Story = {
  name: 'QR kód zobrazený',
  render: () => (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f5f5f2' }}>
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            Pripojiť WhatsApp
          </h3>
          <p style={{ fontSize: 13, color: 'var(--g4, #4B5563)', margin: '0 0 20px' }}>
            Naskenujte QR kód aplikáciou WhatsApp na telefóne.
          </p>
          <div style={{
            background: '#fff',
            padding: 16,
            borderRadius: 12,
            display: 'inline-block',
            marginBottom: 16,
            border: '1px solid var(--g8, #f3f4f6)',
          }}>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=zlatí-remeslníci-wa-demo"
              alt="WhatsApp QR"
              style={{ width: 256, height: 256 }}
            />
          </div>
          <div>
            <button
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--g6, #D0D0D0)', background: 'var(--w, #FFF)',
                color: 'var(--dark, #1a1a1a)', cursor: 'pointer',
              }}
            >
              Zrušiť
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const Connected: Story = {
  name: 'WhatsApp pripojená',
  render: () => (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f5f5f2' }}>
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#25D366' }}>
            WhatsApp pripojená
          </h3>
          <p style={{ fontSize: 13, color: 'var(--g4, #4B5563)', margin: '0 0 20px' }}>
            Teraz môžete posielať správy cez WhatsApp.
          </p>
          <button
            style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'var(--gold, #D4A843)', color: '#FFF', border: 'none', cursor: 'pointer',
            }}
          >
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  ),
}

export const WithError: Story = {
  name: 'Chyba pripojenia',
  render: () => (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f5f5f2' }}>
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--danger, #DC2626)' }}>
            Chyba
          </h3>
          <p style={{ fontSize: 13, color: 'var(--g4, #4B5563)', margin: '0 0 20px' }}>
            Nepodarilo sa spustiť QR generovanie. Uistite sa, že WA služba beží.
          </p>
          <button
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--g6, #D0D0D0)', background: 'var(--w, #FFF)',
              color: 'var(--dark, #1a1a1a)', cursor: 'pointer',
            }}
          >
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  ),
}
