import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ProfileDocuments from './ProfileDocuments'

const t = (key: string) => {
  const map: Record<string, string> = {
    'profilePage.documents': 'Dokumenty',
    'profilePage.uploadDoc': 'Nahrať dokument',
    'profilePage.noDocuments': 'Žiadne dokumenty',
    'profilePage.expires': 'Platnosť do',
    'profilePage.download': 'Stiahnuť',
    'profilePage.delete': 'Odstrániť',
  }
  return map[key] ?? key
}

const meta = {
  title: 'Dispatch/Profile/Documents',
  component: ProfileDocuments,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sekcia dokumentov technika v profile. Správa živnostenských listov, poistenia zodpovednosti, certifikátov a iných dokumentov. Nahrávanie PDF/JPG max 10 MB. Zobrazuje dátum vypršania platnosti s upozornením. API: GET/POST/DELETE /api/dispatch/profile/documents.',
      },
    },
  },
  tags: ['autodocs'],
  args: { t },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileDocuments>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Dokumenty (live API)',
}
