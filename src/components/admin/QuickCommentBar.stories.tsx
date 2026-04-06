import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import QuickCommentBar from './QuickCommentBar'

const meta: Meta<typeof QuickCommentBar> = {
  title: 'Admin/QuickCommentBar',
  component: QuickCommentBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline lišta pre rýchle pridanie komentára k zákazke. Odoslaním (Enter alebo tlačidlo) volá POST /api/jobs/{id}/notes. Stav odosielania blokuje opakované odoslanie.',
      },
    },
  },
  argTypes: {
    onCommentAdded: { action: 'commentAdded' },
  },
  beforeEach: () => {
    // Mock the notes API
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/jobs/') && url.includes('/notes')) {
        return new Response(JSON.stringify({ note: { id: 1, content: 'Test', created_at: new Date().toISOString() } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof QuickCommentBar>

export const Default: Story = {
  args: {
    jobId: 42,
    onCommentAdded: () => console.log('Comment added!'),
  },
}
