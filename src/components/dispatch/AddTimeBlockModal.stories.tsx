import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AddTimeBlockModal from './AddTimeBlockModal'

const t = (key: string) => {
  const map: Record<string, string> = {
    'calendar.addBlock': 'Pridať blok',
    'calendar.date': 'Dátum',
    'calendar.startTime': 'Začiatok',
    'calendar.endTime': 'Koniec',
    'calendar.reason': 'Dôvod (nepovinné)',
    'calendar.save': 'Uložiť',
    'calendar.cancel': 'Zrušiť',
    'calendar.blockType.blocked': 'Blokovaný čas',
    'calendar.blockType.vacation': 'Dovolenka',
    'calendar.blockType.personal': 'Osobné',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/AddTimeBlockModal',
  component: AddTimeBlockModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre pridanie časového bloku do kalendára technika. Typy bloku: Blokovaný čas, Dovolenka, Osobné. Nastavenie dátumu, začiatku a konca. Voliteľný dôvod. Používa CSS triedy z dispatch calendar štýlov.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSave: fn(),
    onClose: fn(),
    t,
  },
} satisfies Meta<typeof AddTimeBlockModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Bez predbežného dátumu',
}

export const WithDate: Story = {
  name: 'S predbežným dátumom',
  args: { selectedDate: '2026-03-25' },
}
