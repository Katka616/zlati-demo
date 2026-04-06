import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase1Diagnostic',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase1Diagnostic
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Prvá fáza portálu — zákazka je v stave diagnostiky. Zobrazuje stav zákazky, kontaktné informácie a informáciu, že pracujeme na pridelení technika.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálová fáza: <code>diagnostic</code></li>
        <li>CRM krok: 0 (prijem) alebo 1 (dispatching)</li>
        <li>Diagnostický brain výstup — ak existuje, zobrazí sa súhrn diagnostiky</li>
        <li>Informácia o poisťovni a čísle zákazky</li>
        <li>Tlačidlo na kontaktovanie podpory (chat)</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Tento komponent je 1000+ riadkový page-level komponent. Zobrazenie vyžaduje live token a DB dáta z <code>/api/portal/[token]</code>.
        </p>
      </div>
    </div>
  ),
}
