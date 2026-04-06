import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import StickyActionBar from './StickyActionBar'

const meta: Meta<typeof StickyActionBar> = {
  title: 'Admin/StickyActionBar',
  component: StickyActionBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Kompaktný sticky bar, ktorý sa objaví pri scrolle pod hlavičku (> 280px). Zobrazuje referenčné číslo, partner farebný dot, status pill a primárne akčné tlačidlo. Animovaný slide-in z vrchu.',
      },
    },
  },
  argTypes: {
    currentStep: { control: { type: 'range', min: 0, max: 14 } },
    onPrimaryAction: { action: 'primary action clicked' },
  },
}

export default meta
type Story = StoryObj<typeof StickyActionBar>

/**
 * StickyActionBar is conditionally visible based on scroll position.
 * Stories force it visible using a decorator that sets window.scrollY > 280.
 */
function ForceVisibleBar(props: Parameters<typeof StickyActionBar>[0]) {
  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Override transform so the bar is always visible in Storybook */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border, #E5E5E5)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{props.referenceNumber}</span>

        {props.partnerCode && (
          <>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: props.partnerColor || '#1976D2',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>{props.partnerCode}</span>
          </>
        )}

        <span style={{
          padding: '3px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 700,
          background: '#F59E0B', color: '#FFF',
        }}>
          Na mieste
        </span>

        <span style={{ flex: 1 }} />

        <button
          onClick={props.onPrimaryAction}
          style={{
            padding: '6px 18px', borderRadius: 8,
            background: 'var(--gold, #bf953f)', color: '#FFF',
            fontWeight: 700, fontSize: 12,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(191,149,63,0.25)',
          }}
        >
          Potvrdiť diagnostiku
        </button>
      </div>
    </div>
  )
}

export const Default: Story = {
  name: 'AXA zákazka — technik na mieste (krok 3)',
  render: () => (
    <ForceVisibleBar
      referenceNumber="AXA-2026-0312"
      currentStep={3}
      partnerCode="AXA"
      partnerColor="#1976D2"
      techPhase="arrived"
      onPrimaryAction={() => console.log('Primary action')}
    />
  ),
}

export const EAPartner: Story = {
  name: 'EA zákazka — cenová ponuka (krok 5)',
  render: () => (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border, #E5E5E5)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>EA-2026-0157</span>

        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#7C3AED',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>EA</span>

        <span style={{
          padding: '3px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 700,
          background: '#D97706', color: '#FFF',
        }}>
          Cenová ponuka klientovi
        </span>

        <span style={{ flex: 1 }} />

        <button
          style={{
            padding: '6px 18px', borderRadius: 8,
            background: 'var(--gold, #bf953f)', color: '#FFF',
            fontWeight: 700, fontSize: 12,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(191,149,63,0.25)',
          }}
        >
          Klient schválil
        </button>
      </div>
    </div>
  ),
}

export const NoAction: Story = {
  name: 'Bez primárnej akcie (posledný krok)',
  render: () => (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border, #E5E5E5)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>AXA-2026-0089</span>

        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#1976D2',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>AXA</span>

        <span style={{
          padding: '3px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 700,
          background: '#16A34A', color: '#FFF',
        }}>
          Uzavreté
        </span>

        <span style={{ flex: 1 }} />
      </div>
    </div>
  ),
}
