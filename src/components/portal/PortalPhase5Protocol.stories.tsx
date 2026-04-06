import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase5Protocol',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase5Protocol
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Piata fáza — zákazka je dokončená, čaká sa na podpis finálneho protokolu alebo prebieha kontrola zúčtovania.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálové fázy: <code>protocol</code>, <code>awaiting_protocol_signature</code>, <code>settlement_review</code></li>
        <li>CRM kroky: 6 (dokončené), 7 (zúčtovanie)</li>
        <li>Pre <code>protocol</code>: zobrazuje <code>PortalFinalProtocol</code> — podpis klientom</li>
        <li>Pre <code>settlement_review</code>: info panel "Zákazka sa spracováva"</li>
        <li>Tlačidlo na stiahnutie protokolu PDF: <code>GET /api/portal/[token]/pdf</code></li>
        <li>Voliteľne zobrazuje <code>ClientPriceQuote</code> so súhrnným rozpisom</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Page-level komponent. Vyžaduje live token a dáta z <code>/api/portal/[token]</code>.
        </p>
      </div>
    </div>
  ),
}
