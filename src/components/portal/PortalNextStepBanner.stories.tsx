import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PortalNextStepBanner } from './PortalNextStepBanner'

const meta: Meta<typeof PortalNextStepBanner> = {
  title: 'Portal/PortalNextStepBanner',
  component: PortalNextStepBanner,
  parameters: {
    docs: {
      description: {
        component:
          'Zložiteľný zlatý banner pod progress barom. Zobrazuje ikonu + nadpis + popis aktuálnej fázy. Kliknutím na hlavičku alebo "Rozumiem" sa zbalí. Skrytý pre fázy rating a closed.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalNextStepBanner>

export const Diagnostic: Story = {
  name: 'Fáza: Diagnostika',
  args: { phase: 'diagnostic', lang: 'cz' },
}

export const Technician: Story = {
  name: 'Fáza: Technik',
  args: { phase: 'technician', lang: 'cz' },
}

export const InProgress: Story = {
  name: 'Fáza: Oprava prebieha',
  args: { phase: 'in_progress', lang: 'cz' },
}

export const Surcharge: Story = {
  name: 'Fáza: Doplatok',
  args: { phase: 'surcharge', lang: 'cz' },
}

export const WorkPaused: Story = {
  name: 'Fáza: Práca prerušená (detailná info)',
  args: { phase: 'work_paused', lang: 'cz' },
}

export const SettlementReview: Story = {
  name: 'Fáza: Kontrola vyúčtovania',
  args: { phase: 'settlement_review', lang: 'cz' },
}

export const Slovak: Story = {
  name: 'Slovensky',
  args: { phase: 'in_progress', lang: 'sk' },
}

export const RatingHidden: Story = {
  name: 'Fáza: Hodnotenie — banner sa nezobrazí',
  args: { phase: 'rating', lang: 'cz' },
  render: (args) => (
    <div style={{ padding: 24 }}>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, marginBottom: 12 }}>
        Pre fázu "rating" a "closed" sa banner nezobrazí (returns null):
      </p>
      <PortalNextStepBanner {...args} />
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 12, fontStyle: 'italic' }}>
        (prázdne — komponent nič nevykreslil)
      </p>
    </div>
  ),
}
