import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import RemoveTechnicianModal from './RemoveTechnicianModal'

const meta: Meta<typeof RemoveTechnicianModal> = {
  title: 'Admin/RemoveTechnicianModal',
  component: RemoveTechnicianModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre odobratie technika zo zákazky. Vyžaduje výber dôvodu (povinný) a voliteľnú poznámku. Po odobratí sa zákazka vracia na krok "Dispatching" a stáva sa dostupnou v marketplace.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'closed' },
    onConfirm: { action: 'confirmed' },
  },
}

export default meta
type Story = StoryObj<typeof RemoveTechnicianModal>

function ModalWrapper({ isLoading = false }: { isLoading?: boolean }) {
  const [open, setOpen] = useState(true)
  const [reason, setReason] = useState('')

  if (!open) {
    return (
      <div style={{ padding: 24, fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ color: 'var(--g4, #4B5563)' }}>Modal bol zatvorený. Obnoviť stranku pre reset.</p>
      </div>
    )
  }

  return (
    <RemoveTechnicianModal
      isOpen={open}
      technicianName="Novák Marek"
      referenceNumber="AXA-2026-0312"
      onClose={() => setOpen(false)}
      onConfirm={(r, note) => {
        setReason(r)
        console.log('Odobratie:', r, note)
        setOpen(false)
      }}
      isLoading={isLoading}
    />
  )
}

export const Default: Story = {
  name: 'Štandardné odobratie',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper />
    </div>
  ),
}

export const Loading: Story = {
  name: 'Stav načítavania (po potvrdení)',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper isLoading={true} />
    </div>
  ),
}
