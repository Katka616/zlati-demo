import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import GroupedPipeline from './GroupedPipeline'

const meta: Meta<typeof GroupedPipeline> = {
  title: 'Admin/GroupedPipeline',
  component: GroupedPipeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '4-fázový zoskupený pipeline namiesto 15 bodiek. Fázy: Príjem & Dispatch (0–2), Práca & Odhad (3–7), Dokončenie & Kontrola (8–10), Fakturácia & Platba (11–14). Klik na fázu expandne detail. Podporuje: diagnostic-only (oranžová), awaiting_next_visit (modrá pulzujúca).',
      },
    },
  },
  argTypes: {
    currentStep: {
      control: { type: 'range', min: 0, max: 14 },
      description: 'Aktuálny CRM krok (0–14)',
    },
    isDiagnosticOnly: { control: 'boolean' },
    isAwaitingNextVisit: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof GroupedPipeline>

function InteractivePipeline(props: Parameters<typeof GroupedPipeline>[0]) {
  const [step, setStep] = useState(props.currentStep)
  return (
    <div style={{ maxWidth: 700 }}>
      <GroupedPipeline {...props} currentStep={step} onStepClick={s => setStep(s)} />
      <p style={{ fontSize: 12, color: 'var(--g4, #4B5563)', marginTop: 8 }}>
        Klikni na fázu pre rozbalenie. Klikni na krok pre preskok.
      </p>
    </div>
  )
}

export const Default: Story = {
  name: 'Zákazka na mieste (krok 3)',
  render: () => (
    <InteractivePipeline
      currentStep={3}
      onStepClick={() => {}}
      subStatuses={[
        { label: 'AXA', value: 'aktívna', color: '#1976D2' },
        { label: 'Technik', value: 'Novák M.', color: '#4B5563' },
      ]}
    />
  ),
}

export const PriceApproval: Story = {
  name: 'Schvaľovanie ceny (krok 5)',
  render: () => (
    <InteractivePipeline
      currentStep={5}
      onStepClick={() => {}}
      subStatuses={[
        { label: 'EA', value: 'Europ Assistance', color: '#7C3AED' },
        { label: 'Doplatok', value: '2 500 Kč', color: '#D97706' },
      ]}
    />
  ),
}

export const DiagnosticOnly: Story = {
  name: 'Diagnostika bez opravy (oranžová)',
  render: () => (
    <InteractivePipeline
      currentStep={4}
      onStepClick={() => {}}
      isDiagnosticOnly={true}
      subStatuses={[
        { label: 'AXA', value: 'diagnostika', color: '#E65100' },
      ]}
    />
  ),
}

export const AwaitingNextVisit: Story = {
  name: 'Čaká na ďalší výjazd (krok 7, modrá)',
  render: () => (
    <InteractivePipeline
      currentStep={7}
      onStepClick={() => {}}
      isAwaitingNextVisit={true}
      nextVisitDate="2026-04-05T09:00:00"
    />
  ),
}

export const NearlyComplete: Story = {
  name: 'Cenová kontrola (krok 10)',
  render: () => (
    <InteractivePipeline
      currentStep={10}
      onStepClick={() => {}}
      skippedSteps={[]}
      subStatuses={[
        { label: 'SEC', value: 'Security Support', color: '#059669' },
      ]}
    />
  ),
}

export const Invoicing: Story = {
  name: 'Fakturácia (krok 12)',
  render: () => (
    <InteractivePipeline
      currentStep={12}
      onStepClick={() => {}}
    />
  ),
}
