import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/Phase2Technician',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalPhase2Technician
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Druhá fáza — technik je pridelený. Zobrazuje kartu technika (meno, hodnotenie) a navrhnutý termín návštevy.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>Portálové fázy: <code>technician</code>, <code>technician_on_way</code>, <code>schedule_confirmation</code></li>
        <li>CRM krok: 2 (naplánované)</li>
        <li>Karta technika: meno, hodnotenie (hviezdičky), fotografia (ak dostupná)</li>
        <li>Navrhnutý termín + možnosť potvrdenia (<code>PortalScheduleConfirmation</code>)</li>
        <li>GPS tracking tlačidlo ak je technik na ceste (<code>technician_on_way</code>)</li>
        <li>Reschedule alert ak existuje otvorená žiadosť o zmenu termínu</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Page-level komponent. Vyžaduje live token a dáta z <code>/api/portal/[token]</code>.
        </p>
      </div>
    </div>
  ),
}
