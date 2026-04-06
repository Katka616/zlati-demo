import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/PortalChat',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        PortalChat
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Floating chat FAB v klientskom portáli. Kliknutím na tlačidlo 💬 sa otvorí panel s dvoma tabmi:
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li><strong>🎧 Asistencia</strong> — AI asistent / operátor (channel: client)</li>
        <li><strong>🔧 Technik</strong> — priama správa technikovi (channel: tech-client), dostupné len ak bol technik pridelený</li>
      </ul>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Správy sa načítavajú z <code>/api/portal/[token]/chat</code> a pollujú každých 5 sekúnd. Nové správy (unread) zobrazí badge na FAB.
      </p>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Tento komponent vyžaduje portálový kontext (token, job data, live API). Interaktívna story nie je možná bez backendu.
        </p>
      </div>
    </div>
  ),
}
