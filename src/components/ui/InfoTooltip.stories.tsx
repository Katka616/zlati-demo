'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import InfoTooltip from './InfoTooltip'

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof InfoTooltip> = {
  title: 'UI/InfoTooltip',
  component: InfoTooltip,
  argTypes: {
    text: { control: 'text' },
    position: {
      control: 'select',
      options: ['above', 'below'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Tooltip ikona "i" — zobrazuje bublinu cez React Portal (nikdy nie je orezaná overflow kontajnerom). Hover alebo klik aktivuje zobrazenie.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof InfoTooltip>

// ── Helper wrapper — centers content so tooltip fits in canvas ─────────────

const CenteredWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 8,
      color: 'var(--text-primary, #1A1A1A)',
      fontSize: 14,
      fontFamily: 'Montserrat, system-ui, sans-serif',
    }}
  >
    {children}
  </div>
)

// ── Stories ────────────────────────────────────────────────────────────────

export const Zakladny: Story = {
  name: 'Základný (above)',
  args: {
    text: 'Zákazka je priradená techniku na základe GPS vzdialenosti a špecializácie.',
    position: 'above',
  },
  decorators: [(Story) => <CenteredWrapper><span>Priradenie technika</span><Story /></CenteredWrapper>],
}

export const PoziciaNizko: Story = {
  name: 'Pozícia: below',
  args: {
    text: 'Doplatok hradí zákazník priamo techniku na mieste pred začatím prác.',
    position: 'below',
  },
  decorators: [(Story) => <CenteredWrapper><span>Doplatok zákazníka</span><Story /></CenteredWrapper>],
}

export const DlhyText: Story = {
  name: 'Dlhý text',
  args: {
    text: 'Cenová kontrola prebieha po odoslaní protokolu. Operátor overí súlad fakturovanej sumy s dohodnutou cenou a schváli alebo zamietne vyúčtovanie. V prípade zamietnutia je technik vyzvaný na opravu faktúry.',
    position: 'above',
  },
  decorators: [(Story) => <CenteredWrapper><span>Cenová kontrola</span><Story /></CenteredWrapper>],
}

export const VKontexteFormulara: StoryObj = {
  name: 'V kontexte formulára',
  render: () => (
    <div style={{ maxWidth: 480, padding: 32, fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary, #1A1A1A)',
            marginBottom: 6,
          }}
        >
          Referenčné číslo
          <InfoTooltip text="Číslo zákazky z objednávky poisťovne. Nájdeš ho v hlavičke emailu od EA / AXA." position="above" />
        </label>
        <input
          type="text"
          placeholder="napr. EA-2024-123456"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: 14,
            background: 'var(--bg-card, #fff)',
            color: 'var(--text-primary, #1A1A1A)',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary, #1A1A1A)',
            marginBottom: 6,
          }}
        >
          Doplatok zákazníka (Kč)
          <InfoTooltip text="Suma, ktorú zákazník hradí nad rámec krytia poisťovňou. Musí byť vopred schválená zákazníkom pred začatím prác." position="above" />
        </label>
        <input
          type="number"
          placeholder="0"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: 14,
            background: 'var(--bg-card, #fff)',
            color: 'var(--text-primary, #1A1A1A)',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary, #1A1A1A)',
            marginBottom: 6,
          }}
        >
          EA odhláška
          <InfoTooltip text="Automaticky odoslaná po uzavretí zákazky. Vyžaduje aktívne pripojenie na EA portál. Ak zlyhá, spustí sa manuálny fallback." position="below" />
        </label>
        <select
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: 14,
            background: 'var(--bg-card, #fff)',
            color: 'var(--text-primary, #1A1A1A)',
            boxSizing: 'border-box',
          }}
        >
          <option>Automaticky</option>
          <option>Manuálne</option>
        </select>
      </div>
    </div>
  ),
}

export const Playgroundový: Story = {
  name: 'Playground (controls)',
  args: {
    text: 'Toto je tooltip text — uprav ho v Controls paneli.',
    position: 'above',
  },
  decorators: [(Story) => <CenteredWrapper><span>Nastaviteľný tooltip</span><Story /></CenteredWrapper>],
}
