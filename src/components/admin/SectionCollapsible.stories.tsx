import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SectionCollapsible from './SectionCollapsible'

const meta: Meta<typeof SectionCollapsible> = {
  title: 'Admin/SectionCollapsible',
  component: SectionCollapsible,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Skladateľná sekcia pre admin job detail panel. Obsahuje ikonu, nadpis, voliteľný badge a chevron. Podporuje drag-and-drop pre JobDetailLayoutEditor. Stav (open/close) riadi cez forceOpen prop z rodiča.',
      },
    },
  },
  argTypes: {
    badgeType: { control: 'radio', options: ['synced', 'readonly'] },
    defaultOpen: { control: 'boolean' },
    isDraggable: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof SectionCollapsible>

export const Closed: Story = {
  args: {
    id: 'sec-info',
    icon: '📋',
    title: 'Informácie o zákazke',
    defaultOpen: false,
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        Obsah sekcie — informácie o zákazke.
      </div>
    ),
  },
}

export const Open: Story = {
  args: {
    id: 'sec-pricing',
    icon: '💰',
    title: 'Cenová kalkulácia',
    defaultOpen: true,
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        <p>Celkový odhad: <strong>2 450 Kč</strong></p>
        <p>Práca: 1 hodina × 890 Kč = 890 Kč</p>
        <p>Cestovné: 25 km × 8 Kč = 200 Kč</p>
      </div>
    ),
  },
}

export const WithBadge: Story = {
  name: 'So synced badge',
  args: {
    id: 'sec-ea',
    icon: '🔗',
    title: 'EA Integrácia',
    badge: 'Synced',
    badgeType: 'synced',
    defaultOpen: true,
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        Europ Assistance synchronizácia — odhláška odoslaná.
      </div>
    ),
  },
}

export const WithReadonlyBadge: Story = {
  name: 'S readonly badge',
  args: {
    id: 'sec-portal',
    icon: '🌐',
    title: 'Klientský portál',
    badge: 'Read-only',
    badgeType: 'readonly',
    defaultOpen: false,
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        Portálový link a stav zákazky z pohľadu klienta.
      </div>
    ),
  },
}

export const WithActions: Story = {
  name: 'S akciami v hlavičke',
  args: {
    id: 'sec-photos',
    icon: '📷',
    title: 'Fotodokumentácia',
    defaultOpen: true,
    actions: (
      <button style={{
        padding: '4px 10px', fontSize: 11, fontWeight: 600,
        border: '1px solid #D1D5DB', borderRadius: 6,
        background: '#fff', cursor: 'pointer', color: '#374151',
      }}>
        + Pridať foto
      </button>
    ),
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        3 fotky nahraté.
      </div>
    ),
  },
}

export const Draggable: Story = {
  name: 'Drag-and-drop mód',
  args: {
    id: 'sec-draggable',
    icon: '⠿',
    title: 'Presúvateľná sekcia',
    defaultOpen: true,
    isDraggable: true,
    children: (
      <div style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
        Táto sekcia sa dá presúvať v layout editore.
      </div>
    ),
  },
}
