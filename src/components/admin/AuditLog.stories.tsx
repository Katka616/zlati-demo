import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AuditLog from './AuditLog'

const meta: Meta<typeof AuditLog> = {
  title: 'Admin/AuditLog',
  component: AuditLog,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Audit log zákazky alebo technika. Načíta záznamy z GET /api/audit-log?entityType={type}&entityId={id}. Každý záznam zobrazuje akciu, kto ju vykonal, kedy a prípadné zmeny polí (starý → nový obsah).',
      },
    },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('audit-log')) {
        return new Response(JSON.stringify({
          entries: [
            {
              id: 1, entity_type: 'job', entity_id: 42,
              action: 'status_change',
              changed_by_phone: '+420777000001',
              changed_by_name: 'Marta Horáčková',
              changed_by_role: 'operator',
              changes: [{ field: 'status', old: 'dispatching', new: 'naplanovane' }],
              created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            },
            {
              id: 2, entity_type: 'job', entity_id: 42,
              action: 'assign',
              changed_by_phone: '+420777000001',
              changed_by_name: 'Marta Horáčková',
              changed_by_role: 'operator',
              changes: [{ field: 'assigned_to', old: null, new: 7 }],
              created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            },
            {
              id: 3, entity_type: 'job', entity_id: 42,
              action: 'create',
              changed_by_phone: '+420777000002',
              changed_by_name: 'Systém',
              changed_by_role: 'system',
              changes: null,
              created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
            },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof AuditLog>

export const ForJob: Story = {
  name: 'Audit log zákazky',
  args: {
    entityType: 'job',
    entityId: 42,
  },
}

export const ForTechnician: Story = {
  name: 'Audit log technika',
  args: {
    entityType: 'technician',
    entityId: 7,
  },
}
