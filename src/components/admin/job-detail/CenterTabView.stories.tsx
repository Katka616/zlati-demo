import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import CenterTabView from './CenterTabView'

const meta: Meta<typeof CenterTabView> = {
  title: 'Admin/JobDetail/CenterTabView',
  component: CenterTabView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '5-tabový wrapper pre stredovú sekciu job detailu: Priebeh, Diagnostika, Cena & Faktúry, Komunikácia, Dokumenty. Auto-selektuje tab podľa CRM kroku. Komunikácia má badge pre neprečítané správy, Dokumenty pre počet fotiek.',
      },
    },
  },
  argTypes: {
    currentStep: { control: { type: 'range', min: 0, max: 14 } },
    unreadCount: { control: { type: 'number' } },
    photoCount: { control: { type: 'number' } },
  },
}

export default meta
type Story = StoryObj<typeof CenterTabView>

const tabPlaceholder = (label: string, color = 'var(--g8, #f3f4f6)') => (
  <div style={{
    padding: '40px 20px', background: color, borderRadius: 10,
    textAlign: 'center', color: 'var(--g4, #4B5563)', fontSize: 13, fontWeight: 500,
  }}>
    {label} — obsah sekcie
  </div>
)

export const Default: Story = {
  name: 'Zákazka na mieste (krok 3) — tab Priebeh',
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <CenterTabView
        currentStep={3}
        unreadCount={0}
        photoCount={5}
        priebeh={tabPlaceholder('Priebeh práce — technik na mieste')}
        diagnostika={tabPlaceholder('Diagnostika — popis závady')}
        cena={tabPlaceholder('Cena & Faktúry — kalkulácia')}
        komunikacia={tabPlaceholder('Komunikácia — chat')}
        dokumenty={tabPlaceholder('Dokumenty — fotky, protokol')}
      />
    </div>
  ),
}

export const WithUnreadMessages: Story = {
  name: 'Neprečítané správy (badge 3)',
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <CenterTabView
        currentStep={2}
        unreadCount={3}
        photoCount={0}
        priebeh={tabPlaceholder('Priebeh — plánovaná zákazka')}
        diagnostika={tabPlaceholder('Diagnostika — čaká na príchod technika')}
        cena={tabPlaceholder('Cena & Faktúry — odhad')}
        komunikacia={(
          <div style={{ padding: '20px', background: 'var(--g8, #f3f4f6)', borderRadius: 10 }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Správy od zákazníka</div>
            {[
              { sender: 'Zákazník', msg: 'Kedy príde technik? Čakám doma.', time: '09:42', unread: true },
              { sender: 'Zákazník', msg: 'Zavolajte mi pred príchodom.', time: '09:50', unread: true },
              { sender: 'Zákazník', msg: 'Mám nový telefón: +421 911 999 888', time: '10:05', unread: true },
            ].map((m, i) => (
              <div key={i} style={{
                padding: '10px 12px', marginBottom: 6, borderRadius: 8,
                background: m.unread ? '#EFF6FF' : '#fff',
                border: `1px solid ${m.unread ? '#BFDBFE' : 'var(--g8, #f3f4f6)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{m.sender}</span>
                  <span style={{ fontSize: 11, color: 'var(--g5, #9ca3af)' }}>{m.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13 }}>{m.msg}</p>
              </div>
            ))}
          </div>
        )}
        dokumenty={tabPlaceholder('Dokumenty')}
      />
    </div>
  ),
}

export const PricingTab: Story = {
  name: 'Zúčtovanie (krok 9) — auto-tab Cena & Faktúry',
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <CenterTabView
        currentStep={9}
        unreadCount={0}
        photoCount={12}
        priebeh={tabPlaceholder('Priebeh — práca dokončená')}
        diagnostika={tabPlaceholder('Diagnostika — vodovodná inštalácia')}
        cena={(
          <div style={{ padding: 20, background: '#f9fafb', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Záverečné zúčtovanie</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { label: 'Práca (1.5h)', value: '1 295 Kč' },
                { label: 'Cestovné (28 km)', value: '924 Kč' },
                { label: 'Materiál', value: '437 Kč' },
                { label: 'DPH (12%)', value: '319 Kč' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, padding: '8px 0', color: 'var(--gold-text, #8B6914)' }}>
                <span>Celkom</span>
                <span>2 975 Kč</span>
              </div>
            </div>
          </div>
        )}
        komunikacia={tabPlaceholder('Komunikácia')}
        dokumenty={tabPlaceholder('Dokumenty — 12 fotiek')}
      />
    </div>
  ),
}
