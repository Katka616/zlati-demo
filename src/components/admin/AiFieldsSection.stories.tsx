import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import AiFieldsSection from './AiFieldsSection'

const meta: Meta<typeof AiFieldsSection> = {
  title: 'Admin/AiFieldsSection',
  component: AiFieldsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Collapsible section in the job detail panel. Lazy-loads AI field values from the API when expanded. Supports per-field regeneration and inline manual editing. Uses the gold Sparkles icon as the AI indicator.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof AiFieldsSection>

// ─── Mock API response payloads ───────────────────────────────────────────────

const fieldsWithValues = {
  fields: [
    {
      definition: {
        id: 1,
        field_key: 'risk_level',
        label: 'Rizikovosť zákazky',
        output_format: 'label',
        output_options: ['nizky', 'stredny', 'vysoky'],
      },
      value: {
        id: 101,
        value: 'stredny',
        is_error: false,
        error_message: null,
        model_used: 'gpt-4o-mini',
        generated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        triggered_by: 'auto',
        manually_edited: false,
      },
    },
    {
      definition: {
        id: 2,
        field_key: 'customer_sentiment',
        label: 'Nálada zákazníka',
        output_format: 'label',
        output_options: ['pozitivny', 'neutralny', 'negativny'],
      },
      value: {
        id: 102,
        value: 'negativny',
        is_error: false,
        error_message: null,
        model_used: 'gpt-4o-mini',
        generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        triggered_by: 'manual',
        manually_edited: true,
      },
    },
    {
      definition: {
        id: 3,
        field_key: 'ai_summary',
        label: 'AI Zhrnutie zákazky',
        output_format: 'text',
        output_options: [],
      },
      value: {
        id: 103,
        value:
          'Zákazka sa týka úniku vody pod kuchynskou linkou. Technik Novák Peter diagnostikoval poruchu sifónu a tesnení. Oprava bola dokončená v štandardnom čase.',
        is_error: false,
        error_message: null,
        model_used: 'gpt-4o',
        generated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        triggered_by: 'auto',
        manually_edited: false,
      },
    },
    {
      definition: {
        id: 4,
        field_key: 'quality_assessment',
        label: 'Hodnotenie kvality',
        output_format: 'label',
        output_options: ['vynikajuca', 'dobra', 'nedostatocna'],
      },
      value: null,
    },
  ],
}

const fieldsEmpty = { fields: [] }

const fieldsWithError = {
  fields: [
    {
      definition: {
        id: 1,
        field_key: 'risk_level',
        label: 'Rizikovosť zákazky',
        output_format: 'label',
        output_options: ['nizky', 'stredny', 'vysoky'],
      },
      value: {
        id: 101,
        value: null,
        is_error: true,
        error_message: 'OpenAI API timeout po 30s',
        model_used: null,
        generated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        triggered_by: 'auto',
        manually_edited: false,
      },
    },
    {
      definition: {
        id: 2,
        field_key: 'ai_summary',
        label: 'AI Zhrnutie zákazky',
        output_format: 'text',
        output_options: [],
      },
      value: {
        id: 102,
        value: 'Zákazka bola dokončená bez problémov.',
        is_error: false,
        error_message: null,
        model_used: 'gpt-4o-mini',
        generated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        triggered_by: 'auto',
        manually_edited: false,
      },
    },
  ],
}

// ─── Fetch mock decorator factory ─────────────────────────────────────────────

/**
 * Returns a Storybook decorator that stubs window.fetch for API calls
 * made by AiFieldsSection. Restores original fetch after unmount.
 */
function withFetchMock(payload: object, delayMs = 0) {
  return {
    beforeEach() {
      const original = window.fetch
      window.fetch = async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        await new Promise(r => setTimeout(r, delayMs))
        // GET ai-fields → return mocked fields
        if (url.includes('/ai-fields') && !url.match(/\/ai-fields\/\d+/)) {
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        // POST generate / PATCH value → return ok
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return () => { window.fetch = original }
    },
  }
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const WithGeneratedFields: Story = {
  name: 'Vygenerované AI polia',
  parameters: {
    ...withFetchMock(fieldsWithValues),
    docs: {
      description: {
        story:
          'Klikni na hlavičku "AI Polia" pre rozbalenie. Zobrazí 4 polia — rizikovosť, nálada zákazníka, zhrnutie a hodnotenie kvality. Posledné pole ešte nebolo vygenerované.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 8, background: '#fff' }}>
      <AiFieldsSection jobId={42} />
    </div>
  ),
}

export const NoPoliciesConfigured: Story = {
  name: 'Žiadne AI polia nakonfigurované',
  parameters: {
    ...withFetchMock(fieldsEmpty),
    docs: {
      description: {
        story: 'Prázdny stav — v systéme nie sú nakonfigurované žiadne AI definície polí.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 8, background: '#fff' }}>
      <AiFieldsSection jobId={43} />
    </div>
  ),
}

export const WithErrors: Story = {
  name: 'Chyba pri generovaní',
  parameters: {
    ...withFetchMock(fieldsWithError),
    docs: {
      description: {
        story: 'Prvé pole zlyhalo (OpenAI timeout). Druhé je vygenerované správne. Chyba sa zobrazí červenou.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 8, background: '#fff' }}>
      <AiFieldsSection jobId={44} />
    </div>
  ),
}

export const SlowNetwork: Story = {
  name: 'Pomalá sieť (loading state)',
  parameters: {
    ...withFetchMock(fieldsWithValues, 2000),
    docs: {
      description: {
        story: 'Simuluje pomalé API — po kliknutí na hlavičku uvidíš "Načítavam AI polia..." počas 2 sekúnd.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 8, background: '#fff' }}>
      <AiFieldsSection jobId={45} />
    </div>
  ),
}

export const InJobDetailContext: Story = {
  name: 'V kontexte detail zákazky',
  parameters: {
    ...withFetchMock(fieldsWithValues),
    docs: {
      description: {
        story: 'Ako vyzerá sekcia vložená do panelu zákazky medzi ďalšími sekciami.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 520, border: '1px solid #E8E2D6', borderRadius: 8, background: '#fff' }}>
      {/* Simulated adjacent section above */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E2D6' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Popis zákazky</span>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
          Únik vody pod kuchynskou linkou v byte na 3. poschodí. Zákazník hlási kvapkanie cca 3 dni.
        </p>
      </div>
      <AiFieldsSection jobId={46} />
      {/* Simulated adjacent section below */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #E8E2D6' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Poznámky</span>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
          Žiadne poznámky.
        </p>
      </div>
    </div>
  ),
}
