import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const Placeholder = () => (
  <div style={{
    padding: 32,
    background: 'var(--w, #fff)',
    borderRadius: 12,
    border: '2px dashed var(--g6, #D1D5DB)',
    textAlign: 'center',
    color: 'var(--g4, #6B7280)',
    fontFamily: "'Montserrat', sans-serif",
    lineHeight: 1.6,
  }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #111)', marginBottom: 8 }}>
      LeftDetailPanel
    </div>
    <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
      Ľavý panel detailu zákazky — kontajner, ktorý agreguje sekcie: BasicInfo, Customer, Technician, EA, Pricing,
      Payment, PartnerInvoice, AIValidation. Nemá vlastnú logiku — renderuje sekcie podľa konfigurácie zákazky
      a aktuálneho stavu (crm_step, partner_id). Dokumentácia v <code>/admin/jobs/[id]</code>.
    </div>
    <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12 }}>
      {['BasicInfoSection', 'CustomerSection', 'TechnicianSection', 'EASection', 'PricingSection', 'PaymentSection', 'PartnerInvoiceSection', 'AIValidationSection'].map(s => (
        <span key={s} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
          {s}
        </span>
      ))}
    </div>
  </div>
)

const meta = {
  title: 'Admin/JobDetail/LeftDetailPanel',
  component: Placeholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'LeftDetailPanel je orchestrátorový komponent ľavého stĺpca v admin detaile zákazky. Skladá sa zo všetkých informačných sekcií (Basic, Customer, Technician, EA, Pricing, Payment, PartnerInvoice, AIValidation). Kvôli komplexnosti závisí od celého stavu zákazky — najlepšie viditeľné priamo v aplikácii.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Documentation: Story = { name: 'Dokumentácia' }
