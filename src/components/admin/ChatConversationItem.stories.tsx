import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ChatConversationItem, { type AdminChatConversation } from './ChatConversationItem'

const meta: Meta<typeof ChatConversationItem> = {
  title: 'Admin/Chat/ChatConversationItem',
  component: ChatConversationItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Riadok v zozname chatových konverzácií. Zobrazuje avatar s iniciálkami, meno klienta, referenčné číslo, posledná správa, stav workspace (AI_ACTIVE, OPERATOR_NEEDED, OPERATOR_ACTIVE, RESOLVED) a prioritu. Obsahuje pin tlačidlo.',
      },
    },
  },
  argTypes: {
    isSelected: { control: 'boolean' },
    onClick: { action: 'clicked' },
    onTogglePin: { action: 'pinToggled' },
  },
}

export default meta
type Story = StoryObj<typeof ChatConversationItem>

const baseConv: AdminChatConversation = {
  jobId: 42,
  referenceNumber: 'ZR-2026-00042',
  partnerName: 'AXA',
  isPinned: false,
  isVip: false,
  activeSides: 'client',
  state: 'AI_ACTIVE',
  reasonCode: null,
  urgency: 'normal',
  operatorPriority: 'low',
  operatorPriorityReason: 'general_handoff',
  waitingOn: 'system',
  assignedOperatorPhone: null,
  isMine: false,
  customerName: 'Jana Nováková',
  customerPhone: '+420777123456',
  technicianName: 'Tomáš Kovář',
  technicianPhone: '+420606123456',
  status: 'na_mieste',
  crmStep: 3,
  techPhase: 'diagnostics',
  scheduledDate: '2026-03-18',
  scheduledTime: '09:00',
  lastRelevantMessagePreview: 'Technik je na ceste, príde o 10 minút.',
  lastRelevantMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  hasUnreadExternal: false,
  category: 'Inštalatér',
}

export const AiActive: Story = {
  name: 'AI rieši',
  args: {
    conversation: baseConv,
    isSelected: false,
    onClick: () => {},
    onTogglePin: () => {},
  },
}

export const OperatorNeeded: Story = {
  name: 'Čaká na operátora (vysoká priorita)',
  args: {
    conversation: {
      ...baseConv,
      state: 'OPERATOR_NEEDED',
      operatorPriority: 'high',
      operatorPriorityReason: 'tech_blocked_on_site',
      reasonCode: 'human_requested',
      hasUnreadExternal: true,
      lastRelevantMessagePreview: 'Zákazník je nahnevaný, žiada hovor s manažérom.',
    },
    isSelected: false,
    onClick: () => {},
    onTogglePin: () => {},
  },
}

export const Selected: Story = {
  name: 'Vybraná konverzácia',
  args: {
    conversation: {
      ...baseConv,
      state: 'OPERATOR_ACTIVE',
      isMine: true,
      operatorPriority: 'medium',
    },
    isSelected: true,
    onClick: () => {},
    onTogglePin: () => {},
  },
}

export const Pinned: Story = {
  name: 'Pripnutá',
  args: {
    conversation: {
      ...baseConv,
      isPinned: true,
      state: 'OPERATOR_NEEDED',
      operatorPriority: 'top',
    },
    isSelected: false,
    onClick: () => {},
    onTogglePin: () => {},
    assignedOperatorName: 'Marta Horáčková',
  },
}

export const Resolved: Story = {
  name: 'Vyriešená',
  args: {
    conversation: {
      ...baseConv,
      state: 'RESOLVED',
      operatorPriority: 'low',
      lastRelevantMessagePreview: 'Zákazka úspešne ukončená. Ďakujem za spoluprácu!',
    },
    isSelected: false,
    onClick: () => {},
    onTogglePin: () => {},
  },
}
