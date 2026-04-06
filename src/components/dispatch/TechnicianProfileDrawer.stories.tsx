import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import TechnicianProfileDrawer from './TechnicianProfileDrawer'
import type { TechnicianProfile } from '@/types/dispatch'

const mockTechnician: TechnicianProfile = {
  id: 5,
  name: 'Marek Kováčik',
  phone: '+420 602 876 543',
  email: 'marek.kovacik@technik.cz',
  country: 'CZ',
  specializations: ['01. Plumber', '04. Gas boiler'],
  applianceBrands: ['Vaillant', 'Junkers', 'Bosch'],
  isAvailable: true,
  status: 'senior',
  workingHours: {
    monday: { from: '08:00', to: '17:00', enabled: true },
    tuesday: { from: '08:00', to: '17:00', enabled: true },
    wednesday: { from: '08:00', to: '17:00', enabled: true },
    thursday: { from: '08:00', to: '17:00', enabled: true },
    friday: { from: '08:00', to: '16:00', enabled: true },
    saturday: { from: '09:00', to: '13:00', enabled: false },
    sunday: { from: '00:00', to: '00:00', enabled: false },
  },
  serviceRadiusKm: 40,
  pricing: { firstHourRate: 950, additionalHourRate: 850, kmRate: 12, currency: 'CZK' },
  stats: { completedJobs: 127, monthlyJobs: 12, rating: 4.8, successRate: 94, monthlyEarnings: 38500 },
}

const meta = {
  title: 'Dispatch/TechnicianProfileDrawer',
  component: TechnicianProfileDrawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Slide-in panel celého profilu technika. Spustí sa klikom na avatar FAB tlačidlo v layoute. Obsahuje Hero sekciu, Štatistiky, Sadzby, Dostupnosť, Vozidlo, Odchodovú adresu, Dokumenty, Podpis a tlačidlo Odhlásiť. Ukladá zmeny sekciu po sekcii.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onLogout: fn(),
    onRefresh: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TechnicianProfileDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  name: 'Otvorený panel',
  args: { technician: mockTechnician },
}

export const Closed: Story = {
  name: 'Zatvorený panel',
  args: { technician: mockTechnician, isOpen: false },
}
