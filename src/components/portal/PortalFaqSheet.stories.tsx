import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import { PortalFaqSheet } from './PortalFaqSheet'

const meta: Meta = {
  title: 'Portal/PortalFaqSheet',
  parameters: {
    docs: {
      description: {
        component:
          'Bottom-sheet FAQ panel s vyhľadávaním. Fázovo relevantné otázky sa zobrazujú hore s badge "Aktuálně". Tlačidlo "Napsat na podporu" volá onOpenChat callback.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function FaqSheetDemo({ phase, lang }: { phase: string; lang: 'cz' | 'sk' | 'en' }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ padding: 24 }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 20px',
          background: 'var(--gold, #BF953F)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Otvoriť FAQ ({phase})
      </button>
      <PortalFaqSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        phase={phase}
        lang={lang}
        onOpenChat={() => alert('Otváranie chatu...')}
      />
    </div>
  )
}

export const DiagnosticPhase: Story = {
  name: 'Fáza: Diagnostika — česky',
  render: () => <FaqSheetDemo phase="diagnostic" lang="cz" />,
}

export const SurchargePhase: Story = {
  name: 'Fáza: Doplatok — česky',
  render: () => <FaqSheetDemo phase="surcharge" lang="cz" />,
}

export const Slovak: Story = {
  name: 'Slovensky — fáza protokol',
  render: () => <FaqSheetDemo phase="protocol" lang="sk" />,
}

export const English: Story = {
  name: 'Anglicky',
  render: () => <FaqSheetDemo phase="in_progress" lang="en" />,
}
