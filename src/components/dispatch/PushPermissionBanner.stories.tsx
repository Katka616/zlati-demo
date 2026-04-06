import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import PushPermissionBanner from './PushPermissionBanner'

/**
 * PushPermissionBanner uses the `usePushNotifications` hook which relies on
 * browser APIs (Notification, ServiceWorker). In Storybook we render only the
 * visual UI — the hook's internal logic (permission checks, localStorage) is
 * not exercised here. Use the decorator below to force-show the banner.
 */

/** Inline stub that renders the banner markup directly without the hook. */
function BannerStub({
  lang = 'sk',
  denied = false,
  iosInBrowser = false,
}: {
  lang?: 'sk' | 'cz'
  denied?: boolean
  iosInBrowser?: boolean
}) {
  const cz = lang === 'cz'

  const title = denied
    ? (cz ? 'Notifikace jsou zablokované' : 'Notifikácie sú zablokované')
    : iosInBrowser
      ? (cz ? 'Přidejte aplikaci na plochu' : 'Pridajte aplikáciu na plochu')
      : (cz ? 'Zapněte notifikace' : 'Zapnite notifikácie')

  const body = denied
    ? (cz ? 'Bez notifikací vám unikají zakázky. Povolte je v nastavení prohlížeče.' : 'Bez notifikácií vám unikajú zákazky. Povoľte ich v nastaveniach prehliadača.')
    : iosInBrowser
      ? (cz ? 'V Safari klikněte na ikonu sdílení (□↑) → "Přidat na plochu" pro push notifikace.' : 'V Safari kliknite na ikonu zdieľania (□↑) → "Pridať na plochu" pre push notifikácie.')
      : (cz ? 'Bez notifikací můžete přijít o nové nabídky zakázek.' : 'Bez notifikácií môžete prísť o nové ponuky zákaziek.')

  return (
    <div style={{
      background: denied
        ? 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.03))'
        : 'linear-gradient(135deg, rgba(191,149,63,0.10), rgba(191,149,63,0.04))',
      border: denied
        ? '1px solid rgba(220,38,38,0.2)'
        : '1px solid rgba(191,149,63,0.25)',
      borderRadius: 14,
      padding: '14px 16px',
      margin: '0 16px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <svg
        width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={denied ? '#DC2626' : 'var(--gold, #BF953F)'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {denied && <line x1="1" y1="1" x2="23" y2="23" />}
      </svg>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark, #0C0A09)', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--g4, #57534E)', lineHeight: '1.4' }}>
          {body}
        </div>
      </div>

      {!denied && !iosInBrowser && (
        <button style={{
          padding: '8px 16px',
          borderRadius: 10,
          background: 'var(--gold, #BF953F)',
          color: '#fff',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {cz ? 'Zapnout' : 'Zapnúť'}
        </button>
      )}

      <button
        aria-label={cz ? 'Zavřít' : 'Zavrieť'}
        style={{ background: 'none', border: 'none', color: 'var(--g5, #A8A29E)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

const meta = {
  title: 'Dispatch/PushPermissionBanner',
  component: PushPermissionBanner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Banner vyzývajúci technika na povolenie push notifikácií. Zobrazuje sa keď notifikácie nie sú povolené a neboli zamietnuté v posledných 24 hodinách. Tri varianty: normálna výzva (zlatá), zablokované (červená), iOS v prehliadači (inštrukcie). Keďže komponent závisí od browser API, stories renderujú vizuálny stub.',
      },
    },
  },
  tags: ['autodocs'],
  render: (args) => <BannerStub lang={args.lang} />,
  argTypes: {
    lang: { control: 'radio', options: ['sk', 'cz'] },
  },
  args: {
    lang: 'sk',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PushPermissionBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Výzva na zapnutie notifikácií (SK)',
  render: () => <BannerStub lang="sk" />,
}

export const Czech: Story = {
  name: 'Česká verzia',
  render: () => <BannerStub lang="cz" />,
}

export const Denied: Story = {
  name: 'Notifikácie zablokované',
  render: () => <BannerStub lang="sk" denied={true} />,
}

export const IosInBrowser: Story = {
  name: 'iOS Safari — inštrukcia "Pridaj na plochu"',
  render: () => <BannerStub lang="sk" iosInBrowser={true} />,
}
