import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase6Rating',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase6Rating
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Šiesta fáza — zákazka je takmer uzavretá. Klient je vyzvaný na hodnotenie technika a služby.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálová fáza: <code>rating</code></li>
        <li>CRM kroky: 8 (cenová kontrola), 9 (EA odhláška)</li>
        <li>Hviezdičkové hodnotenie (1–5) technika</li>
        <li>Voliteľný textový komentár</li>
        <li>Po odoslaní: hodnotenie sa uloží do DB a zákazka prejde na uzavretie</li>
        <li><code>PortalNextStepBanner</code> a <code>PortalHelpButton</code> sú pre túto fázu skryté</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Page-level komponent. Vyžaduje live token. Hodnotenie sa posiela na <code>POST /api/portal/[token]/action</code> s <code>action: "rate"</code>.
        </p>
      </div>
    </div>
  ),
}
