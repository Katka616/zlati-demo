import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import PhotoUploadModal from './PhotoUploadModal'
import type { DispatchJob } from '@/types/dispatch'

const baseJob: DispatchJob = {
  id: '42',
  name: 'ZR-2026-CZ-0042',
  referenceNumber: 'ZR-2026-CZ-0042',
  insurance: 'Europ Assistance',
  category: '01. Plumber',
  customerAddress: 'Václavské náměstí 1',
  customerCity: 'Praha 1',
  customerName: 'Martin Dvořák',
  customerPhone: '+420 602 123 456',
  urgency: 'normal',
  createdAt: new Date().toISOString(),
  status: 'na_mieste',
  crmStep: 3,
}

const meta = {
  title: 'Dispatch/PhotoUploadModal',
  component: PhotoUploadModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal pre nahrávanie fotodokumentácie zákazky. Max 5 fotiek, JPG/PNG. Klientská kompresia cez canvas (max 1200px, JPEG 80%). Existujúce fotky sa načítajú z API a zobrazujú ako thumbnaily. Fotky sa okamžite nahrávajú cez POST /api/dispatch/photos.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    lang: 'cz',
    onClose: fn(),
    onPhotosComplete: fn(),
    techPhase: 'arrived',
  },
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
    techPhase: {
      control: 'select',
      options: ['arrived', 'diagnostics', 'working', 'photos_done'],
    },
  },
} satisfies Meta<typeof PhotoUploadModal>

export default meta
type Story = StoryObj<typeof meta>

export const Arrived: Story = {
  name: 'Fáza: Príchod — pred fotkami',
  args: { job: baseJob, techPhase: 'arrived' },
}

export const Working: Story = {
  name: 'Fáza: Pracujem — fotky počas práce',
  args: { job: baseJob, techPhase: 'working' },
}
