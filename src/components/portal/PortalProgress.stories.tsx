import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PortalProgress } from './PortalProgress'
import { getPortalTexts } from './portalLocale'

const tCz = getPortalTexts('cz')
const tSk = getPortalTexts('sk')

const meta: Meta<typeof PortalProgress> = {
  title: 'Portal/PortalProgress',
  component: PortalProgress,
  parameters: {
    docs: {
      description: {
        component:
          'Horizontálny progress bar klientskeho portálu. Zobrazuje 6–8 krokov podľa toho či zákazka má doplatok alebo potvrdenie termínu. Dokončené kroky sú zelené s ✓.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalProgress>

export const Diagnostic: Story = {
  name: 'Fáza: Diagnostika',
  args: { currentPhase: 'diagnostic', hasSurcharge: false, t: tCz },
}

export const Technician: Story = {
  name: 'Fáza: Technik pridelený',
  args: { currentPhase: 'technician', hasSurcharge: false, t: tCz },
}

export const InProgress: Story = {
  name: 'Fáza: Oprava prebieha',
  args: { currentPhase: 'in_progress', hasSurcharge: false, t: tCz },
}

export const WithSurcharge: Story = {
  name: 'Fáza: Doplatok (zobrazí extra krok)',
  args: { currentPhase: 'surcharge', hasSurcharge: true, t: tCz },
}

export const Protocol: Story = {
  name: 'Fáza: Protokol',
  args: { currentPhase: 'protocol', hasSurcharge: false, t: tCz },
}

export const Rating: Story = {
  name: 'Fáza: Hodnotenie',
  args: { currentPhase: 'rating', hasSurcharge: false, t: tCz },
}

export const Closed: Story = {
  name: 'Fáza: Uzavretá (všetky kroky ✓)',
  args: { currentPhase: 'closed', hasSurcharge: false, t: tCz },
}

export const Slovak: Story = {
  name: 'Slovensky',
  args: { currentPhase: 'in_progress', hasSurcharge: false, t: tSk },
}
