import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PortalInlineHint } from './PortalInlineHint'

const meta: Meta<typeof PortalInlineHint> = {
  title: 'Portal/PortalInlineHint',
  component: PortalInlineHint,
  parameters: {
    docs: {
      description: {
        component:
          'Malý informačný / varovný box s ikonou a textom. Variant "info" má modré tónovanie, "warning" oranžové. Voliteľne dismissible — zobrazí X tlačidlo a zapamatá si zatvorenosť v sessionStorage.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalInlineHint>

export const Info: Story = {
  name: 'Info variant',
  args: {
    variant: 'info',
    text: 'Technik je na ceste k vám. Predpokladaný čas príchodu je 09:30 – 10:00.',
  },
}

export const Warning: Story = {
  name: 'Warning variant',
  args: {
    variant: 'warning',
    text: 'V prípade odmietnutia doplatku technik vykoná len práce hradené z poistenia. Oprava môže byť čiastočná.',
  },
}

export const Dismissible: Story = {
  name: 'Dismissible (s X tlačidlom)',
  args: {
    variant: 'info',
    text: 'Podpíšte prstom priamo v rámčeku. Podpis nemusí byť dokonalý.',
    dismissible: true,
    storageKey: 'storybook_hint_demo',
  },
}

export const DismissibleWarning: Story = {
  name: 'Dismissible — warning',
  args: {
    variant: 'warning',
    text: 'Ak doplatok odmietnete, zákazka bude pozastavená a poisťovňa vás bude kontaktovať.',
    dismissible: true,
  },
}
