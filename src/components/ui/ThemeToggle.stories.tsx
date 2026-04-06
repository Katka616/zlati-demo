'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'
import ThemeToggle from './ThemeToggle'
import { ThemeProvider } from './ThemeProvider'

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['pill', 'icon'],
      description: '`pill` — celý prepínač so štítkom, `icon` — minimalistická ikona',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Prepínač svetlého / tmavého režimu. Vyžaduje `<ThemeProvider>`. Synchronizuje `data-theme` atribút na `<html>` a ukladá voľbu do `localStorage`.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ThemeToggle>

// ── Stories ────────────────────────────────────────────────────────────────

export const Pill: Story = {
  name: 'Variant: pill (default)',
  args: { variant: 'pill' },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}

export const Icon: Story = {
  name: 'Variant: icon',
  args: { variant: 'icon' },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}

export const ObaPospol: StoryObj = {
  name: 'Oba varianty',
  render: () => (
    <ThemeProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          padding: 40,
          fontFamily: 'Montserrat, system-ui, sans-serif',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary, #6B7280)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            pill (nastavenia, sidebar)
          </p>
          <ThemeToggle variant="pill" />
        </div>
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary, #6B7280)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            icon (navigácia, tesné miesta)
          </p>
          <ThemeToggle variant="icon" />
        </div>
      </div>
    </ThemeProvider>
  ),
}

export const VNavigacii: StoryObj = {
  name: 'V kontexte navigácie',
  render: () => (
    <ThemeProvider>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 56,
          background: 'var(--bg-card, #fff)',
          borderBottom: '1px solid var(--border, #E5E7EB)',
          fontFamily: 'Montserrat, system-ui, sans-serif',
        }}
      >
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--gold, #C9A84C)',
            letterSpacing: 1,
          }}
        >
          Zlatí Řemeslníci
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary, #6B7280)' }}>Operátor</span>
          <ThemeToggle variant="icon" />
        </div>
      </nav>
    </ThemeProvider>
  ),
}

export const Playground: Story = {
  name: 'Playground (controls)',
  args: { variant: 'pill' },
  decorators: [
    (Story) => (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}
