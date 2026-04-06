import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Portal/CounterProposalForm',
}

export default meta

export const Documentation: StoryObj = {
  name: 'Dokumentácia',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 520 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>
        CounterProposalForm
      </h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Formulár pre návrh alternatívnych termínov zo strany klienta. Zobrazí sa keď klient odmietne navrhnutý termín technikovom a chce ponúknuť vlastné termíny.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
        <li>1–3 časové sloty (dátum + čas)</li>
        <li>Prvý slot je "Preferovaný termín", ďalšie sú alternatívy</li>
        <li>Validácia: termín musí byť aspoň 2 hodiny od teraz</li>
        <li>Voliteľná správa pre technika</li>
        <li>Po odoslaní zobrazí success stav</li>
      </ul>
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ color: '#374151', fontSize: 12, margin: 0 }}>
          ⓘ Tento komponent posiela dáta na <code>/api/reschedule/[id]/respond?token=[token]</code>. Interaktívna story vyžaduje live backend.
        </p>
      </div>
    </div>
  ),
}
