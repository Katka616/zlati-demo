import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { InvoiceGateResult } from '@/types/invoiceGate'

const meta = {
  title: 'Admin/CpInvoiceGateChecklist',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Checklist podmienok pred schválením faktúry. Zobrazuje prechod/zlyhanie/pending pre každý gate check. Operátor môže manuálne schváliť napriek chybám s povinným odôvodnením.',
      },
    },
  },
}

export default meta
type Story = StoryObj

/** Static mock of the rendered checklist (avoids live API fetch in Storybook) */
function MockChecklist({
  checks,
  override,
  showOverrideForm = false,
}: {
  checks: InvoiceGateResult['checks']
  override?: InvoiceGateResult['override']
  showOverrideForm?: boolean
}) {
  const hasFailures = checks.some(c => !c.pass && !c.pending)
  const hasPending = checks.some(c => c.pending)
  const borderColor = !hasFailures && !hasPending
    ? 'var(--success, #16A34A)'
    : hasFailures
      ? 'var(--danger, #DC2626)'
      : 'var(--warning, #F59E0B)'

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{
        marginTop: 12,
        padding: '12px 14px',
        background: 'var(--surface, #fff)',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary, #1a1a1a)' }}>
          Overenie pred schválením
        </div>

        {override && (
          <div style={{
            padding: '6px 10px', marginBottom: 8, borderRadius: 6,
            background: 'var(--warning-bg, #FFFBEB)', fontSize: 11, color: 'var(--warning-text, #92400E)',
          }}>
            Manuálne schválené: {override.by} ({new Date(override.at).toLocaleDateString('sk-SK')})
            — {override.reason}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checks.map(check => {
            const icon = check.pending ? '⏳' : check.pass ? '✓' : '✗'
            const color = check.pending
              ? 'var(--warning, #F59E0B)'
              : check.pass
                ? 'var(--success, #16A34A)'
                : 'var(--danger, #DC2626)'

            return (
              <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: check.pending ? 'var(--warning-bg, #FFFBEB)' : check.pass ? 'var(--success-bg, #f0fdf4)' : 'var(--danger-bg, #FEF2F2)',
                  color,
                }}>
                  {icon}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary, #1a1a1a)', minWidth: 0 }}>{check.label}</span>
                <span style={{ color: check.pass ? 'var(--text-muted, #999)' : color, fontSize: 11, marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                  {check.detail}
                </span>
              </div>
            )
          })}
        </div>

        {showOverrideForm && hasFailures && !override && (
          <div style={{ marginTop: 10 }}>
            <div style={{ padding: '8px 10px', background: 'var(--danger-bg, #FEF2F2)', borderRadius: 8, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--danger, #DC2626)' }}>
                Dôvod schválenia:
              </div>
              <textarea
                placeholder="Napíšte dôvod prečo je možné schváliť napriek chybám..."
                rows={2}
                style={{
                  width: '100%', minHeight: 50, padding: '6px 8px', fontSize: 12,
                  borderRadius: 6, border: '1px solid var(--border, #ddd)',
                  background: 'var(--surface, #fff)', color: 'var(--text-primary)',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 6,
                  background: 'var(--danger, #DC2626)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontWeight: 600,
                }}>
                  Potvrdiť override
                </button>
                <button style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 6,
                  background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}>
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        )}

        {!showOverrideForm && hasFailures && !override && (
          <div style={{ marginTop: 10 }}>
            <button style={{
              fontSize: 11, color: 'var(--text-muted, #999)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0,
            }}>
              Manuálne schváliť napriek chybám
            </button>
          </div>
        )}

        {hasPending && !override && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warning-text, #92400E)' }}>
            Niektoré kontroly čakajú na dáta — schválenie bude možné po ich doplnení.
          </div>
        )}
      </div>
    </div>
  )
}

export const AllPassed: Story = {
  name: 'Všetky podmienky splnené',
  render: () => (
    <MockChecklist
      checks={[
        { id: 'protocol_signed', label: 'Protokol podpísaný klientom', detail: 'Podpísaný 31.3.2026', pass: true, pending: false },
        { id: 'tech_invoice', label: 'Faktúra technika nahratá', detail: 'faktura_2026_novak.pdf', pass: true, pending: false },
        { id: 'pricing_final', label: 'Ceny sú finalizované', detail: 'Krok 10+', pass: true, pending: false },
        { id: 'coverage_ok', label: 'Krytie poisťovne v limite', detail: '13 760 Kč z 15 000 Kč', pass: true, pending: false },
      ]}
    />
  ),
}

export const WithFailures: Story = {
  name: 'Niektoré podmienky nesplnené',
  render: () => (
    <MockChecklist
      checks={[
        { id: 'protocol_signed', label: 'Protokol podpísaný klientom', detail: 'Čaká na podpis zákazníka', pass: false, pending: false },
        { id: 'tech_invoice', label: 'Faktúra technika nahratá', detail: 'Faktúra chýba', pass: false, pending: false },
        { id: 'pricing_final', label: 'Ceny sú finalizované', detail: 'Krok 10+', pass: true, pending: false },
        { id: 'coverage_ok', label: 'Krytie poisťovne v limite', detail: '13 760 Kč z 15 000 Kč', pass: true, pending: false },
      ]}
    />
  ),
}

export const WithOverrideForm: Story = {
  name: 'Override form otvorený',
  render: () => (
    <MockChecklist
      checks={[
        { id: 'protocol_signed', label: 'Protokol podpísaný klientom', detail: 'Zákazník nedostupný', pass: false, pending: false },
        { id: 'tech_invoice', label: 'Faktúra technika nahratá', detail: 'faktura_2026_novak.pdf', pass: true, pending: false },
        { id: 'pricing_final', label: 'Ceny sú finalizované', detail: 'Krok 10+', pass: true, pending: false },
        { id: 'coverage_ok', label: 'Krytie poisťovne v limite', detail: '13 760 Kč z 15 000 Kč', pass: true, pending: false },
      ]}
      showOverrideForm={true}
    />
  ),
}

export const WithPending: Story = {
  name: 'Pending kontroly',
  render: () => (
    <MockChecklist
      checks={[
        { id: 'protocol_signed', label: 'Protokol podpísaný klientom', detail: 'Čaká sa', pass: false, pending: true },
        { id: 'tech_invoice', label: 'Faktúra technika nahratá', detail: 'Čaká sa', pass: false, pending: true },
        { id: 'pricing_final', label: 'Ceny sú finalizované', detail: 'Krok 10+', pass: true, pending: false },
      ]}
    />
  ),
}

export const ManualllyOverridden: Story = {
  name: 'Manuálne schválené (override)',
  render: () => (
    <MockChecklist
      checks={[
        { id: 'protocol_signed', label: 'Protokol podpísaný klientom', detail: 'Zákazník neodpovedal', pass: false, pending: false },
        { id: 'tech_invoice', label: 'Faktúra technika nahratá', detail: 'faktura_2026_novak.pdf', pass: true, pending: false },
        { id: 'pricing_final', label: 'Ceny sú finalizované', detail: 'Krok 10+', pass: true, pending: false },
      ]}
      override={{
        by: 'Jana Kováčová',
        at: '2026-03-31T14:30:00',
        reason: 'Zákazník potvrdil telefonicky, protokol zasiela poštou.',
      }}
    />
  ),
}
