import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import ReassignmentModal from './ReassignmentModal'

const meta: Meta<typeof ReassignmentModal> = {
  title: 'Admin/JobDetail/ReassignmentModal',
  component: ReassignmentModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Multi-step modal pre zmenu technika na zákazke. Kroky: 1) Checking (loading), 2) Protocol required (žiadny protokol), 3) Protocol unsigned (chýba podpis klienta), 4) Select tech (priamy výber alebo marketplace). Pre zákazky pred krokom 3 sa preskakuje priamo na výber technika.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ReassignmentModal>

const mockTechnicians = [
  { id: 10, first_name: 'Marek',     last_name: 'Novák' },
  { id: 11, first_name: 'Peter',     last_name: 'Kováč' },
  { id: 12, first_name: 'Rastislav', last_name: 'Blaho' },
  { id: 13, first_name: 'Tomáš',     last_name: 'Šimko' },
]

const baseJob = {
  id: 201,
  reference_number: 'AXA-2026-0312',
  assigned_to: 5,
  custom_fields: {} as Record<string, unknown>,
  total_assignments: 1,
  customer_country: 'SK',
}

function ModalWrapper({
  crmStep,
  protocolHistory,
}: {
  crmStep: number
  protocolHistory?: Array<Record<string, unknown>>
}) {
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <div style={{ padding: 32, fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ color: 'var(--g4, #4B5563)' }}>Modal bol zatvorený. Obnoviť stránku pre reset.</p>
      </div>
    )
  }

  return (
    <ReassignmentModal
      isOpen={open}
      onClose={() => setOpen(false)}
      job={{
        ...baseJob,
        crm_step: crmStep,
        custom_fields: protocolHistory ? { protocol_history: protocolHistory } : {},
      }}
      currentTechName="Horváth Ján"
      technicians={mockTechnicians}
      onReassign={async (techId, mode) => {
        console.log('Reassign:', techId, mode)
        setOpen(false)
      }}
    />
  )
}

export const Default: Story = {
  name: 'Výber technika (zákazka pred krokom 3)',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper crmStep={2} />
    </div>
  ),
}

export const ProtocolRequired: Story = {
  name: 'Protokol chýba (krok 5, bez protokolu)',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper crmStep={5} protocolHistory={[]} />
    </div>
  ),
}

export const ProtocolUnsigned: Story = {
  name: 'Protokol čaká na podpis klienta',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper
        crmStep={6}
        protocolHistory={[
          {
            technician_id: 5,
            workDescription: 'Výmena sifóna DN40',
            hours: 1.5,
            km: 28,
            // No clientSignature or signed_at
          },
        ]}
      />
    </div>
  ),
}

export const DirectSelectAfterProtocol: Story = {
  name: 'Protokol podpísaný — priamy výber',
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ModalWrapper
        crmStep={7}
        protocolHistory={[
          {
            technician_id: 5,
            workDescription: 'Výmena sifóna DN40',
            hours: 1.5,
            km: 28,
            client_signature: 'data:image/png;base64,abc',
            signed_at: '2026-03-31T14:00:00',
          },
        ]}
      />
    </div>
  ),
}
