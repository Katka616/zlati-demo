import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import HelpTip from './HelpTip'

const meta = {
  title: 'Dispatch/HelpTip',
  component: HelpTip,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Plávajúce tlačidlo "?" + bottom-sheet nápoveda pre dispatch obrazovky. Obsah sa načítava kontextovo podľa aktuálnej URL (usePathname). Zobrazuje popis, zoznam akcií a tipy pre danú obrazovku. Ak existuje walkthrough, zobrazí aj tlačidlo "Spustiť sprievodcu".',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
  args: { lang: 'sk' },
} satisfies Meta<typeof HelpTip>

export default meta
type Story = StoryObj<typeof meta>

export const Slovak: Story = {
  name: 'SK — tlačidlo nápovedy',
  args: { lang: 'sk' },
}

export const Czech: Story = {
  name: 'CZ — tlačidlo nápovedy',
  args: { lang: 'cz' },
}
