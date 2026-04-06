import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase4Surcharge',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase4Surcharge
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Štvrtá fáza — zákazka čaká na schválenie doplatku od klienta. Celkové náklady presahujú krytie poisťovne.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálové fázy: <code>surcharge</code>, <code>awaiting_surcharge_approval</code></li>
        <li>CRM krok: 5 (cenová ponuka klientovi)</li>
        <li>Zobrazuje komponent <code>PortalSettlementQuote</code> — plný rozpis nákladov</li>
        <li>Klient môže súhlasiť (podpis canvas) alebo odmietnuť</li>
        <li>Voliteľne zobrazuje <code>ClientPriceQuote</code> s detailným rozpisom pre transparentnosť</li>
        <li>Po schválení: fáza prejde na <code>awaiting_surcharge_approval</code> → <code>protocol</code></li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(191,149,63,0.08)', borderRadius: 8, border: '1px solid rgba(191,149,63,0.2)' }}>
        <p style={{ color: '#92400E', fontSize: 12, margin: 0 }}>
          ⚠ Akcie Súhlasím/Nesúhlasím volajú <code>POST /api/portal/[token]/action</code>. Interaktívna story vyžaduje live backend.
        </p>
      </div>
    </div>
  ),
}
