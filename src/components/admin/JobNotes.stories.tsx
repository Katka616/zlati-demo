import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import JobNotes from './JobNotes'

const meta: Meta<typeof JobNotes> = {
  title: 'Admin/JobNotes',
  component: JobNotes,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Správa interných poznámok zákazky. CRUD operácie: pridanie novej poznámky, úprava vlastných poznámok, odstránenie, pin/unpin. Operátor vidí tlačidlá na úpravu iba pre vlastné poznámky. Volá /api/jobs/{id}/notes.',
      },
    },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/notes')) {
        if (!init || init.method === 'GET' || !init.method) {
          return new Response(JSON.stringify({
            notes: [
              { id: 1, content: 'Zákazník je na dovolenke do 20.3. — dohodnúť termín po návrate.', author_name: 'Marta Horáčková', author_phone: '+420777000001', is_pinned: true, created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
              { id: 2, content: 'Techník hlási problém s parkovaním pri adrese. Odporučiť parkovisko za rohom.', author_name: 'Jana Dvořák', author_phone: '+420777000002', is_pinned: false, created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
              { id: 3, content: 'POZOR: klient má alergiu na prach — technik musí pracovať opatrne.', author_name: 'Marta Horáčková', author_phone: '+420777000001', is_pinned: false, created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
            ],
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({
          note: { id: 99, content: 'Nová poznámka', author_name: 'Marta Horáčková', author_phone: '+420777000001', is_pinned: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof JobNotes>

export const Default: Story = {
  name: 'Poznámky zákazky',
  args: {
    jobId: 42,
    currentUserPhone: '+420777000001',
    currentUserName: 'Marta Horáčková',
  },
}

export const ReadonlyUser: Story = {
  name: 'Iný operátor (nemôže upravovať cudzie)',
  args: {
    jobId: 42,
    currentUserPhone: '+420777000099',
    currentUserName: 'Pavel Novák',
  },
}
