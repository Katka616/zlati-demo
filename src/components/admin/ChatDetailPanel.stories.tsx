import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta: Meta = {
  title: 'Admin/Chat/ChatDetailPanel',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ChatDetailPanel** — Centrálny panel s detailom chat konverzácie.

Zobrazuje chat vlákno pre jednu zákazku. Umožňuje prepínanie medzi kanálmi (klient ↔ technik).

### Props
| Prop | Typ |
|------|-----|
| \`jobId\` | \`number\` |
| \`conversation\` | \`AdminChatConversation\` |
| \`onWorkspaceUpdated\` | \`() => void\` |

**Pozrite Admin/Chat/ChatPanel pre vizualizáciu chat interface.**
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Documentation: Story = {
  render: () => (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: 16, background: '#F9FAFB', borderRadius: 10, maxWidth: 500 }}>
      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
        ChatDetailPanel je centrálny stĺpec AdminChatEnvironment. Zobrazuje správy a controls pre jednu konverzáciu.
        Pozrite <strong>Admin/Chat/ChatPanel</strong> pre vizualizáciu chat interface alebo <strong>Admin/Chat/ChatThread</strong> pre samotné vlákno správ.
      </p>
    </div>
  ),
}
