import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PortalHeader } from './PortalHeader'
import { LANG_OPTIONS } from './portalLocale'

const meta: Meta<typeof PortalHeader> = {
  title: 'Portal/PortalHeader',
  component: PortalHeader,
  parameters: {
    docs: {
      description: {
        component:
          'Hlavička klientskeho portálu. Zobrazuje logo, číslo zákazky, prepínač jazyka a farebnú nálepku poisťovne.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PortalHeader>

export const AXA: Story = {
  name: 'AXA poisťovňa',
  args: {
    referenceNumber: 'ZR-2026-0142',
    insurance: 'AXA',
    lang: 'cz',
    langOptions: LANG_OPTIONS,
    onLangChange: () => {},
  },
}

export const EuropAssistance: Story = {
  name: 'Europ Assistance',
  args: {
    referenceNumber: 'ZR-2026-0200',
    insurance: 'EA',
    lang: 'sk',
    langOptions: LANG_OPTIONS,
    onLangChange: () => {},
  },
}

export const English: Story = {
  name: 'Anglicky',
  args: {
    referenceNumber: 'ZR-2026-0099',
    insurance: 'AXA',
    lang: 'en',
    langOptions: LANG_OPTIONS,
    onLangChange: () => {},
  },
}
