import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CollapsibleSection from './CollapsibleSection'

const meta = {
  title: 'Dispatch/CollapsibleSection',
  component: CollapsibleSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zbaliteľná sekcia pre dispatch obrazovky. Animované rozbalenie/zbalenie. Podpora ikony, badge čísla (napr. počet zákaziek), defaultOpen nastavenia. Používa CSS custom properties pre farby a border-radius.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    title: 'Udalosti dnes',
    icon: '📋',
    defaultOpen: false,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CollapsibleSection>

export default meta
type Story = StoryObj<typeof meta>

export const Collapsed: Story = {
  name: 'Zbalená',
  args: {
    children: <div style={{ padding: '8px 0', fontSize: 14 }}>Obsah sekcie po rozbalení.</div>,
  },
}

export const Expanded: Story = {
  name: 'Rozbalená predvolene',
  args: {
    defaultOpen: true,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        <div style={{ padding: 10, background: '#F9FAFB', borderRadius: 8, fontSize: 13 }}>Zákazka ZR-2026-CZ-0042 — 09:00–11:30</div>
        <div style={{ padding: 10, background: '#F9FAFB', borderRadius: 8, fontSize: 13 }}>Zákazka ZR-2026-CZ-0043 — 13:00–15:00</div>
      </div>
    ),
  },
}

export const WithBadge: Story = {
  name: 'S číselným badge',
  args: {
    icon: '🔧',
    title: 'Aktívne zákazky',
    badge: 3,
    defaultOpen: true,
    children: <div style={{ fontSize: 14, padding: '8px 0' }}>Tri zákazky čakajú na vybavenie.</div>,
  },
}

export const NoIcon: Story = {
  name: 'Bez ikony',
  args: {
    title: 'Poznámky',
    icon: undefined,
    children: <div style={{ fontSize: 14, padding: '8px 0' }}>Technická poznámka k zákazke.</div>,
  },
}
