import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ChatActionCard, { DirectMessageCard } from './ChatActionCard'
import type { AdminChatConversation } from './ChatConversationItem'

const meta: Meta<typeof ChatActionCard> = {
  title: 'Admin/Chat/ChatActionCard',
  component: ChatActionCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Akčná karta pre chat workspace. 4 varianty: urgent (červená hranica — zákazník potrebuje operátora), approval (žltá — čaká na schválenie odhadu), direct (zlatá — priama správa technikovi), ai (modrá — AI návrh odpovede).',
      },
    },
  },
  argTypes: {
    variant: { control: 'radio', options: ['urgent', 'approval', 'direct', 'ai'] },
    isSelected: { control: 'boolean' },
    onClick: { action: 'clicked' },
    onQuickApprove: { action: 'approved' },
    onQuickReject: { action: 'rejected' },
  },
}

export default meta
type Story = StoryObj<typeof ChatActionCard>

const baseConv: AdminChatConversation = {
  jobId: 42,
  referenceNumber: 'ZR-2026-00042',
  partnerName: 'AXA',
  isPinned: false,
  isVip: false,
  activeSides: 'client',
  state: 'OPERATOR_NEEDED',
  reasonCode: 'human_requested',
  urgency: 'high',
  operatorPriority: 'high',
  operatorPriorityReason: 'client_complaint',
  waitingOn: 'operator',
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
  lastRelevantMessagePreview: 'Zákazník je nahnevaný, žiada hovor s manažérom. Odmietol navrhnutú cenu.',
  lastRelevantMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  hasUnreadExternal: true,
  category: 'Inštalatér',
}

export const Urgent: Story = {
  name: 'Urgentné (zákazník čaká)',
  args: {
    conversation: baseConv,
    isSelected: false,
    onClick: () => {},
    variant: 'urgent',
  },
}

export const Approval: Story = {
  name: 'Schválenie odhadu',
  args: {
    conversation: {
      ...baseConv,
      reasonCode: 'approval_needed',
      operatorPriorityReason: 'approval_waiting',
      lastRelevantMessagePreview: 'Technik navrhol odhad 3 200 Kč. Klient čaká na vaše schválenie.',
    },
    isSelected: false,
    onClick: () => {},
    variant: 'approval',
    onQuickApprove: async () => console.log('Approved!'),
    onQuickReject: async () => console.log('Rejected!'),
  },
}

export const Direct: Story = {
  name: 'Priama správa od technika',
  args: {
    conversation: {
      ...baseConv,
      operatorPriorityReason: 'general_handoff',
      lastRelevantMessagePreview: 'Mám problém s prístupom k ventilom. Klient nie je doma.',
    },
    isSelected: false,
    onClick: () => {},
    variant: 'direct',
  },
}

export const AiResponse: Story = {
  name: 'AI automatická odpoveď',
  args: {
    conversation: {
      ...baseConv,
      state: 'AI_ACTIVE',
      lastRelevantMessagePreview: 'Ďakujeme za kontakt. Váš technik príde medzi 9:00–11:00. Potvrdíme 30 min pred príchodom.',
    },
    isSelected: false,
    onClick: () => {},
    variant: 'ai',
  },
}

export const DirectMessageCardStory: Story = {
  name: 'DirectMessageCard (technik)',
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <DirectMessageCard
        technicianName="Tomáš Kovář"
        technicianId={7}
        lastMessage="Zákazník ma nepúšťa dovnútra, vraj bol dohodnutý iný termín."
        lastMessageAt={new Date(Date.now() - 8 * 60 * 1000).toISOString()}
        isSelected={false}
        onClick={() => console.log('Direct message clicked')}
      />
    </div>
  ),
}
