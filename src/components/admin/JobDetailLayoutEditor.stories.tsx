import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import JobDetailLayoutEditor from './JobDetailLayoutEditor'
import type { SectionSlot } from '@/lib/pageLayout'
import { JOB_DETAIL_SECTIONS, SIDEBAR_WIDGETS } from '@/lib/pageLayout'

const meta: Meta<typeof JobDetailLayoutEditor> = {
  title: 'Admin/JobDetailLayoutEditor',
  component: JobDetailLayoutEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**JobDetailLayoutEditor** — Floating panel pre konfiguráciu rozloženia stránky zákazky.

Umožňuje operátorom zobraziť/skryť sekcie a sidebar widgety podľa pracovného postupu.
Ukladá konfiguráciu do \`/api/admin/page-layout\`.

### Sekcie (napr.)
- Zákazkový kontext (povinný)
- Timeline aktivít
- Cenový odhad
- Protokoly
- Dokumenty a fotky

### Sidebar widgety (napr.)
- TechPhaseTracker (povinný)
- PricingWidget
- RescheduleSection
- DiagResultPanel
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: 500, background: '#F3F4F6', padding: 20 }}>
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          Simulácia job detail stránky — Layout Editor sa zobrazí dole:
        </p>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof JobDetailLayoutEditor>

function buildDefaultSections(): SectionSlot[] {
  return JOB_DETAIL_SECTIONS.map(s => ({ id: s.id, visible: true }))
}

function buildDefaultWidgets(): SectionSlot[] {
  return SIDEBAR_WIDGETS.map(w => ({ id: w.id, visible: true }))
}

export const Default: Story = {
  name: 'Predvolené rozloženie',
  render: () => {
    const [sections, setSections] = useState<SectionSlot[]>(buildDefaultSections)
    const [widgets, setWidgets] = useState<SectionSlot[]>(buildDefaultWidgets)
    return (
      <JobDetailLayoutEditor
        sections={sections}
        sidebarWidgets={widgets}
        onSectionsChange={setSections}
        onSidebarChange={setWidgets}
        onSave={() => alert('Rozloženie uložené!')}
        onReset={() => {
          setSections(buildDefaultSections())
          setWidgets(buildDefaultWidgets())
        }}
        onClose={() => alert('Zatvoriť editor')}
      />
    )
  },
}

export const WithSomeHidden: Story = {
  name: 'Niektoré sekcie skryté',
  render: () => {
    const [sections, setSections] = useState<SectionSlot[]>(
      JOB_DETAIL_SECTIONS.map((s, i) => ({ id: s.id, visible: i % 2 === 0 || !!s.isMandatory }))
    )
    const [widgets, setWidgets] = useState<SectionSlot[]>(
      SIDEBAR_WIDGETS.map((w, i) => ({ id: w.id, visible: i % 2 === 0 || !!w.isMandatory }))
    )
    return (
      <JobDetailLayoutEditor
        sections={sections}
        sidebarWidgets={widgets}
        onSectionsChange={setSections}
        onSidebarChange={setWidgets}
        onSave={() => alert('Uložené')}
        onReset={() => {
          setSections(buildDefaultSections())
          setWidgets(buildDefaultWidgets())
        }}
        onClose={() => {}}
      />
    )
  },
}
