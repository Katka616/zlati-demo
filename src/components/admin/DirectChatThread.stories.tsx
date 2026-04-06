import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import DirectChatThread from './DirectChatThread'

const meta: Meta<typeof DirectChatThread> = {
  title: 'Admin/DirectChatThread',
  component: DirectChatThread,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**DirectChatThread** — Priamy chat operátor ↔ technik (mimo kontextu zákazky).

Vlákno priamych správ medzi konkrétnym technikom a operátorom. Odlišné od chat workspacov
zákaziek — ide o interný operátorský kanál na koordináciu.

### Props
| Prop | Typ |
|------|-----|
| \`technicianId\` | \`number\` |
| \`technicianName\` | \`string\` |
| \`messages\` | \`DirectMessage[]\` |
| \`onBack\` | \`() => void\` |
| \`onRefresh\` | \`() => Promise<void>\` |
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DirectChatThread>

const now = new Date()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()

const mockMessages = [
  { id: 1, from_role: 'operator' as const, message: 'Ahoj Tomáš, máš zajtra voľno od 14:00? Mám novú zákazku v Prahe 2.', operator_phone: '+421901234567', created_at: minutesAgo(45) },
  { id: 2, from_role: 'tech' as const, message: 'Áno, od 14 som voľný. Čo je to za zákazku?', created_at: minutesAgo(42) },
  { id: 3, from_role: 'operator' as const, message: 'Vodovodná oprava, AXA zákazka. Odhadujem asi 2 hodiny práce.', operator_phone: '+421901234567', created_at: minutesAgo(40) },
  { id: 4, from_role: 'tech' as const, message: 'V pohode, môžem to zobrať. Pošli mi adresu na WhatsApp.', created_at: minutesAgo(38) },
  { id: 5, from_role: 'operator' as const, message: 'Náměstí Míru 15, Praha 2. Zákazka ZR-2026-00044. Klientka: Jana Procházková.', operator_phone: '+421901234567', created_at: minutesAgo(35) },
]

export const WithMessages: Story = {
  name: 'Aktívny chat s históriou',
  args: {
    technicianId: 12,
    technicianName: 'Tomáš Kovář',
    messages: mockMessages,
    onBack: () => alert('Späť'),
    onRefresh: async () => {},
  },
}

export const EmptyThread: Story = {
  name: 'Prázdne vlákno',
  args: {
    technicianId: 12,
    technicianName: 'Tomáš Kovář',
    messages: [],
    onBack: () => alert('Späť'),
    onRefresh: async () => {},
  },
}

export const SingleMessage: Story = {
  name: 'Jedna správa od operátora',
  args: {
    technicianId: 7,
    technicianName: 'Pavel Novák',
    messages: [
      { id: 1, from_role: 'operator', message: 'Dobré ráno, môžeš mi zavolať keď budeš mať chvíľu?', operator_phone: '+421901234567', created_at: minutesAgo(5) },
    ],
    onBack: () => {},
    onRefresh: async () => {},
  },
}
