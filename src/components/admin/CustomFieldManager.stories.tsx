import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CustomFieldManager from './CustomFieldManager'

const mockFields = [
  { id: 1, field_key: 'cislo_skody', label: 'Číslo škody', field_type: 'text' as const, options: [], placeholder: 'napr. AXA-2026-001234', is_required: true, sort_order: 1, is_active: true },
  { id: 2, field_key: 'datum_nahlasenia', label: 'Dátum nahlásenia', field_type: 'date' as const, options: [], placeholder: null, is_required: false, sort_order: 2, is_active: true },
  { id: 3, field_key: 'pokrytie_poistovne', label: 'Pokrytie poisťovne', field_type: 'number' as const, options: [], placeholder: 'Suma v CZK', is_required: false, sort_order: 3, is_active: true },
  { id: 4, field_key: 'typ_zasahu', label: 'Typ zásahu', field_type: 'select' as const, options: ['Oprava', 'Diagnostika', 'Núdzový zásah', 'Revízia'], placeholder: null, is_required: false, sort_order: 4, is_active: true },
  { id: 5, field_key: 'je_urgentne', label: 'Je urgentné', field_type: 'boolean' as const, options: [], placeholder: null, is_required: false, sort_order: 5, is_active: true },
]

const meta: Meta<typeof CustomFieldManager> = {
  title: 'Admin/CustomFieldManager',
  component: CustomFieldManager,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**CustomFieldManager** — Inline renderer vlastných polí pre entity (zákazky, technici, partneri).

Načítava definície polí z \`/api/custom-fields?entity_type=\` a zobrazuje príslušné form inputy.
Polia sú definované v sekcii nastavení (\`/admin/settings/custom-fields\`).

### Typy polí
\`text\`, \`number\`, \`date\`, \`boolean\`, \`select\`, \`multiselect\`, \`textarea\`, \`email\`, \`phone\`, \`url\`

### Props
| Prop | Typ |
|------|-----|
| \`entityType\` | \`'partner' \\| 'technician' \\| 'job'\` |
| \`values\` | \`Record<string, unknown>\` |
| \`onChange\` | \`(key, value) => void\` |
| \`readOnly\` | \`boolean\` |
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof CustomFieldManager>

const fetchMockFields = () => {
  window.fetch = ((url: string) => {
    if (String(url).includes('/api/custom-fields')) {
      return Promise.resolve(new Response(JSON.stringify({ fields: mockFields }), { status: 200 }))
    }
    return Promise.reject(new Error('Not mocked'))
  }) as typeof fetch
}

export const JobFields: Story = {
  name: 'Zákazka — editovateľné polia',
  beforeEach: fetchMockFields,
  args: {
    entityType: 'job',
    values: {
      cislo_skody: 'AXA-2026-001234',
      datum_nahlasenia: '2026-03-18',
      pokrytie_poistovne: 5000,
      typ_zasahu: 'Oprava',
      je_urgentne: true,
    },
    onChange: (key, value) => console.log('onChange', key, value),
    readOnly: false,
  },
}

export const ReadOnly: Story = {
  name: 'Zákazka — len na čítanie',
  beforeEach: fetchMockFields,
  args: {
    entityType: 'job',
    values: {
      cislo_skody: 'AXA-2026-001234',
      datum_nahlasenia: '2026-03-18',
      pokrytie_poistovne: 5000,
      typ_zasahu: 'Oprava',
      je_urgentne: false,
    },
    onChange: () => {},
    readOnly: true,
  },
}

export const EmptyValues: Story = {
  name: 'Prázdne hodnoty',
  beforeEach: fetchMockFields,
  args: {
    entityType: 'job',
    values: {},
    onChange: () => {},
    readOnly: false,
  },
}
