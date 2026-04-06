import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import OfflineBanner from './OfflineBanner'

const meta: Meta<typeof OfflineBanner> = {
  title: 'UI/OfflineBanner',
  component: OfflineBanner,
  parameters: {
    docs: {
      description: {
        component:
          'Banner zobrazovaný keď je zariadenie offline alebo prebieha synchronizácia fronty. V online režime bez syncovania sa nezobrazí nič. Kliknutie vyvolá onSyncClick callback.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof OfflineBanner>

export const Syncing: Story = {
  name: 'Synchronizácia prebieha',
  args: {
    language: 'sk',
    isSyncing: true,
    queuedCount: 3,
    onSyncClick: () => alert('Sync kliknutý'),
  },
}

export const SyncingCzech: Story = {
  name: 'Synchronizácia — česky',
  args: {
    language: 'cz',
    isSyncing: true,
    queuedCount: 2,
  },
}

export const WithQueueCount: Story = {
  name: 'Offline s počtom položiek vo fronte',
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ color: 'var(--text-secondary, #6B7280)', fontSize: 13, marginBottom: 12 }}>
        Poznámka: Banner sa štandardne zobrazí len keď je prehliadač offline. Nižšie je ilustratívny render s isSyncing=true.
      </p>
      <OfflineBanner language="sk" isSyncing={true} queuedCount={5} />
    </div>
  ),
}

export const Documentation: StoryObj = {
  name: 'Dokumentácia — offline stav',
  render: () => (
    <div style={{ padding: 24, background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #E5E7EB)', maxWidth: 480 }}>
      <h3 style={{ color: 'var(--text-primary, #1A1A1A)', margin: '0 0 12px', fontSize: 16, fontFamily: 'Cinzel, serif' }}>OfflineBanner</h3>
      <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
        Komponent monitoruje <code>navigator.onLine</code> a window events <code>online/offline</code>. Zobrazí sa automaticky keď používateľ stratí internetové pripojenie.
      </p>
      <ul style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
        <li><strong>isSyncing=true</strong> — zobrazí animovaný spinner a text syncovania</li>
        <li><strong>offline + queuedCount &gt; 0</strong> — zobrazí počet položiek čakajúcich v offline fronte</li>
        <li><strong>online + isSyncing=false</strong> — nič sa nezobrazí (returns null)</li>
      </ul>
    </div>
  ),
}
