import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import QuickActions from './QuickActions'

const meta: Meta<typeof QuickActions> = {
  title: 'Admin/QuickActions',
  component: QuickActions,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sidebar widget s rýchlymi akciami pre zákazku — 2×2 grid tlačidiel. Každé tlačidlo má ikonu a label. Podporuje disabled stav.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof QuickActions>

export const Default: Story = {
  args: {
    actions: [
      { icon: '📞', label: 'Zavolať klientovi', onClick: () => alert('Volám klienta') },
      { icon: '📱', label: 'SMS technikovi', onClick: () => alert('SMS technikovi') },
      { icon: '📄', label: 'Stiahnuť protokol', onClick: () => alert('Sťahujem PDF') },
      { icon: '🔗', label: 'Portálový link', onClick: () => alert('Kopírujem link') },
    ],
  },
}

export const WithDisabled: Story = {
  name: 'S disabled tlačidlami',
  args: {
    actions: [
      { icon: '📞', label: 'Zavolať klientovi', onClick: () => {} },
      { icon: '📄', label: 'Protokol (nedostupný)', onClick: () => {}, disabled: true, title: 'Protokol ešte nebol odoslaný' },
      { icon: '💳', label: 'Vytvoriť faktúru', onClick: () => {}, disabled: true, title: 'Zákazka nie je ukončená' },
      { icon: '🔗', label: 'Portálový link', onClick: () => {} },
    ],
  },
}

export const ManyActions: Story = {
  name: 'Viac akcií',
  args: {
    actions: [
      { icon: '📞', label: 'Zavolať klientovi', onClick: () => {} },
      { icon: '📱', label: 'SMS technikovi', onClick: () => {} },
      { icon: '📄', label: 'Protokol PDF', onClick: () => {} },
      { icon: '🔗', label: 'Portál link', onClick: () => {} },
      { icon: '🚨', label: 'Eskalovať', onClick: () => {} },
      { icon: '🔄', label: 'Preplánovať', onClick: () => {} },
    ],
  },
}
