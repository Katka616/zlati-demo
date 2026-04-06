'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React, { useState } from 'react'
import { SignaturePadComponent } from './SignaturePad'

const meta: Meta = {
  title: 'Protocol/SignaturePad',
  parameters: {
    docs: {
      description: {
        component:
          'Pad pre zachytenie podpisu prstom alebo myšou. Zobrazuje canvas s hint textom keď je prázdny. Po potvrdení uloží podpis ako PNG base64 a zobrazí náhľad s možnosťou zmazania.',
      },
    },
  },
}

export default meta
type Story = StoryObj

function SignaturePadDemo({ existingSignature }: { existingSignature?: string }) {
  const [signature, setSignature] = useState<string | null>(existingSignature || null)
  const [signerName, setSignerName] = useState('')
  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <SignaturePadComponent
        language="sk"
        onSignatureChange={setSignature}
        existingSignature={signature}
        signerName={signerName}
        onSignerNameChange={setSignerName}
      />
      {signature && (
        <p style={{ fontSize: 12, color: 'var(--success, #16A34A)', marginTop: 8, fontWeight: 500 }}>
          ✓ Podpis zaznamenaný
        </p>
      )}
    </div>
  )
}

export const Empty: Story = {
  name: 'Prázdny canvas',
  render: () => <SignaturePadDemo />,
}

export const WithNote: Story = {
  name: 'S popisom',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <SignaturePadComponent
        language="sk"
        onSignatureChange={() => {}}
        note="Podpíšte sa pre potvrdenie prevzatia opravy a súhlasu s rozsahom vykonaných prác."
      />
    </div>
  ),
}

export const Czech: Story = {
  name: 'Česky',
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <SignaturePadComponent
        language="cz"
        onSignatureChange={() => {}}
      />
    </div>
  ),
}
