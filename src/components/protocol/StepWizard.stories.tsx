'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import StepWizard from './StepWizard'

const meta: Meta = {
  title: 'Protocol/StepWizard',
  parameters: {
    docs: {
      description: {
        component:
          'Navigačný wrapper pre protokolový formulár. Zobrazuje progress bar (body krokov), sekciu s číslom a nadpisom, a spodnú navigáciu (Späť / Ďalej / Odoslať). Posledný krok zobrazí zelené tlačidlo "Odoslať protokol".',
      },
    },
  },
}

export default meta
type Story = StoryObj

function StepWizardDemo({ startStep = 1, protocolType = 'standard_work' as const }) {
  const [currentStep, setCurrentStep] = useState(startStep)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--success, #16A34A)', fontWeight: 700 }}>
        ✓ Protokol odoslaný!
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <StepWizard
        language="sk"
        currentStep={currentStep}
        totalSteps={6}
        protocolType={protocolType}
        onNext={() => setCurrentStep(prev => prev + 1)}
        onPrev={() => setCurrentStep(prev => prev - 1)}
        onSubmit={() => setSubmitted(true)}
      >
        <div style={{ padding: '24px 0', color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>
          Obsah kroku {currentStep} — sem prídu formulárové polia tohto kroku.
        </div>
      </StepWizard>
    </div>
  )
}

export const Step1: Story = {
  name: 'Krok 1 — prvý krok (bez tlačidla Späť)',
  render: () => <StepWizardDemo startStep={1} />,
}

export const Step3: Story = {
  name: 'Krok 3 — uprostred',
  render: () => <StepWizardDemo startStep={3} />,
}

export const LastStep: Story = {
  name: 'Posledný krok (zelené tlačidlo Odoslať)',
  render: () => <StepWizardDemo startStep={6} />,
}

export const Submitting: Story = {
  name: 'Odosielanie (tlačidlá disabled)',
  render: () => (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <StepWizard
        language="sk"
        currentStep={6}
        totalSteps={6}
        protocolType="standard_work"
        onNext={() => {}}
        onPrev={() => {}}
        onSubmit={() => {}}
        isSubmitting={true}
      >
        <div style={{ padding: '24px 0', color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>
          Obsah posledného kroku...
        </div>
      </StepWizard>
    </div>
  ),
}
