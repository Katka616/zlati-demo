import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import MobileFilterDrawer from './MobileFilterDrawer'

const meta: Meta<typeof MobileFilterDrawer> = {
  title: 'Admin/MobileFilterDrawer',
  component: MobileFilterDrawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobilná spodná zásuvka s filtrami zákaziek. Umožňuje filtrovať podľa stavu, partnera a priority. Zobrazuje počet zákaziek zodpovedajúcich aktuálnym filtrom. Otvorí sa po kliknutí na filter tlačidlo v mobile zozname.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof MobileFilterDrawer>

export const Open: Story = {
  name: 'Otvorený — bez filtrov',
  render: () => {
    const [selected, setSelected] = useState({ statuses: [] as string[], partners: [] as string[], priorities: [] as string[] })
    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <MobileFilterDrawer
          isOpen={true}
          onClose={() => {}}
          selectedStatuses={selected.statuses}
          selectedPartners={selected.partners}
          selectedPriorities={selected.priorities}
          totalCount={47}
          onStatusToggle={(key) => setSelected(s => ({ ...s, statuses: s.statuses.includes(key) ? s.statuses.filter(k => k !== key) : [...s.statuses, key] }))}
          onPartnerToggle={(key) => setSelected(s => ({ ...s, partners: s.partners.includes(key) ? s.partners.filter(k => k !== key) : [...s.partners, key] }))}
          onPriorityToggle={(key) => setSelected(s => ({ ...s, priorities: s.priorities.includes(key) ? s.priorities.filter(k => k !== key) : [...s.priorities, key] }))}
          onReset={() => setSelected({ statuses: [], partners: [], priorities: [] })}
          onApply={() => {}}
        />
      </div>
    )
  },
}

export const WithActiveFilters: Story = {
  name: 'S aktívnymi filtrami',
  render: () => {
    const [selected, setSelected] = useState({
      statuses: ['prijem', 'na_mieste'],
      partners: ['1'],
      priorities: [] as string[],
    })
    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <MobileFilterDrawer
          isOpen={true}
          onClose={() => {}}
          selectedStatuses={selected.statuses}
          selectedPartners={selected.partners}
          selectedPriorities={selected.priorities}
          totalCount={12}
          onStatusToggle={(key) => setSelected(s => ({ ...s, statuses: s.statuses.includes(key) ? s.statuses.filter(k => k !== key) : [...s.statuses, key] }))}
          onPartnerToggle={(key) => setSelected(s => ({ ...s, partners: s.partners.includes(key) ? s.partners.filter(k => k !== key) : [...s.partners, key] }))}
          onPriorityToggle={(key) => setSelected(s => ({ ...s, priorities: s.priorities.includes(key) ? s.priorities.filter(k => k !== key) : [...s.priorities, key] }))}
          onReset={() => setSelected({ statuses: [], partners: [], priorities: [] })}
          onApply={() => {}}
        />
      </div>
    )
  },
}
