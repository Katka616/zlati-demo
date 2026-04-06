import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase7Closed',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase7Closed
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Siedma a posledná fáza — zákazka je uzavretá. Zobrazuje záverečnú správu a umožňuje stiahnutie dokumentov.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálová fáza: <code>closed</code></li>
        <li>CRM kroky: 10 (fakturácia), 11 (uhradené), 12 (uzavreté)</li>
        <li>Záverečná "ďakujeme" správa s informáciou o uzavretí</li>
        <li>Tlačidlo na stiahnutie protokolu PDF</li>
        <li>Tlačidlo na stiahnutie všetkých dokumentov (ZIP): <code>GET /api/portal/[token]/download-all</code></li>
        <li>Špeciálne zobrazenie pre <code>cancelled</code> a <code>reklamacia</code> stavy</li>
        <li>Progress bar a PortalNextStepBanner sú skryté</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(22,163,74,0.06)', borderRadius: 8, border: '1px solid rgba(22,163,74,0.15)' }}>
        <p style={{ color: '#14532D', fontSize: 12, margin: 0 }}>
          ✓ Táto fáza je read-only — klient už nevykonáva žiadne akcie. Všetky dáta sú zamrznuté.
        </p>
      </div>
    </div>
  ),
}
