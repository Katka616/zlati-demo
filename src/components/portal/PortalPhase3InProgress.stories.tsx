import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase3InProgress',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase3InProgress
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Tretia fáza — práca prebieha. Technik je na mieste alebo aktívne pracuje. Zobrazuje live stav opravy.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálové fázy: <code>in_progress</code>, <code>onsite_diagnosis</code>, <code>work_in_progress</code>, <code>work_paused</code>, <code>awaiting_next_visit</code></li>
        <li>CRM krok: 3 (na mieste) alebo 4 (schvaľovanie ceny)</li>
        <li>Animovaný indikátor "Práca prebieha" pre aktívne fázy</li>
        <li>Info panel pre <code>work_paused</code> — dôvod pauzy a odhad pokračovania</li>
        <li>Info panel pre <code>awaiting_next_visit</code> — dátum ďalšej návštevy</li>
        <li>Tlačidlo na chat s technikom (ak je pridelený)</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Page-level komponent. Vyžaduje live token a dáta z <code>/api/portal/[token]</code>.
        </p>
      </div>
    </div>
  ),
}
