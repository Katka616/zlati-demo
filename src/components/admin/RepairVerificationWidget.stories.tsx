import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import RepairVerificationWidget from './RepairVerificationWidget'

const meta: Meta<typeof RepairVerificationWidget> = {
  title: 'Admin/RepairVerificationWidget',
  component: RepairVerificationWidget,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Compact widget variant of the repair verification result. Used in job list rows or sidebar cards. Shows a verdict badge in the collapsed header; expands to summary, red flags, parts list, work quality, and metadata. Intentionally more compact than RepairVerificationPanel.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof RepairVerificationWidget>

// ─── Mock verification data ───────────────────────────────────────────────────

type RV = {
  verdict: 'verified' | 'partial' | 'unverifiable' | 'concerns'
  fault_resolved: { assessment: 'yes' | 'no' | 'uncertain'; evidence: string }
  before_after_comparison: string
  parts_assessment: Array<{ name: string; visible_in_photo: 'yes' | 'no' | 'uncertain'; comment: string }>
  parts_match: 'consistent' | 'inconsistent' | 'partially_consistent' | 'no_parts_declared' | 'cannot_assess'
  work_quality: { rating: 'professional' | 'acceptable' | 'poor' | 'cannot_assess'; observations: string[] }
  red_flags: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>
  summary: string
  confidence: 'high' | 'medium' | 'low'
  analyzed_at: string
  before_photos_used: number
  after_photos_used: number
  parts_declared: number
  verification_version: string
}

const base: RV = {
  verdict: 'verified',
  fault_resolved: { assessment: 'yes', evidence: 'Nový sifón je jasně viditelný, okolní plochy suché.' },
  before_after_comparison:
    'Fotografie před zákazkou ukazují prasklý sifón. Po opravě je montáž čistá, bez vlhkosti.',
  parts_assessment: [
    { name: 'Sifón DN40', visible_in_photo: 'yes', comment: 'Viditelný na detailu' },
    { name: 'Těsnění sada', visible_in_photo: 'yes', comment: 'Viditelné ve spoji' },
  ],
  parts_match: 'consistent',
  work_quality: {
    rating: 'professional',
    observations: ['Čistá montáž', 'Bez úniku'],
  },
  red_flags: [],
  summary: 'Oprava úspěšně ověřena. Výměna sifónu proběhla bez problémů.',
  confidence: 'high',
  analyzed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  before_photos_used: 2,
  after_photos_used: 3,
  parts_declared: 2,
  verification_version: '1.2',
}

const partialRv: RV = {
  ...base,
  verdict: 'partial',
  fault_resolved: { assessment: 'uncertain', evidence: 'Fotografie neposkytují dostatečný detail.' },
  parts_match: 'partially_consistent',
  work_quality: { rating: 'acceptable', observations: ['Dokumentácia je nedostatočná'] },
  red_flags: [
    {
      type: 'NEDOSTATOČNÁ DOKUMENTÁCIA',
      description: 'Fotografie neobsahují detail spoje. Kontaktujte technika pre doplnenie.',
      severity: 'medium',
    },
  ],
  summary: 'Zákazka částečně ověřena. Fotodokumentace je nedostatečná.',
  confidence: 'medium',
}

const concernsRv: RV = {
  ...base,
  verdict: 'concerns',
  fault_resolved: { assessment: 'uncertain', evidence: 'Fotografie nezodpovedajú popísanej závade.' },
  parts_match: 'inconsistent',
  work_quality: { rating: 'cannot_assess', observations: [] },
  red_flags: [
    {
      type: 'NESÚLAD MIESTA OPRAVY',
      description: 'Fotografie zachycují jiné místnosti než popsaná závada.',
      severity: 'high',
    },
    {
      type: 'CHÝBAJÚCI MATERIÁL',
      description: 'Deklarovaný sifón DN40 nie je viditeľný na žiadnej fotografii.',
      severity: 'high',
    },
  ],
  summary: 'Nalezeny závažné nesrovnalosti — fotografie nezodpovídají zakázce.',
  confidence: 'high',
}

const unverifiableRv: RV = {
  ...base,
  verdict: 'unverifiable',
  fault_resolved: { assessment: 'uncertain', evidence: '' },
  parts_assessment: [],
  red_flags: [],
  summary: 'Overenie nie je možné — chýbajú fotografie.',
  confidence: 'low',
  before_photos_used: 0,
  after_photos_used: 0,
}

// ─── Fetch mock for re-analyze button ─────────────────────────────────────────

const withReanalyzeMock = {
  beforeEach() {
    const original = window.fetch
    window.fetch = async () => {
      await new Promise(r => setTimeout(r, 1000))
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return () => { window.fetch = original }
  },
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const EmptyState: Story = {
  name: 'Prázdny stav — čaká',
  parameters: {
    docs: {
      description: {
        story: 'Widget pred prvou analýzou. Zobrazí len hlavičku so stavom "Čeká". Tlačidlo re-analýzy nie je viditeľné.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <RepairVerificationWidget repairVerification={null} jobId={200} />
    </div>
  ),
}

export const Verified: Story = {
  name: 'Overené ✅',
  parameters: { ...withReanalyzeMock },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <RepairVerificationWidget
        repairVerification={base}
        jobId={201}
        onRefresh={() => console.log('refresh')}
      />
    </div>
  ),
}

export const Partial: Story = {
  name: 'Výstraha ⚠️',
  parameters: { ...withReanalyzeMock },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <RepairVerificationWidget
        repairVerification={partialRv}
        jobId={202}
        onRefresh={() => console.log('refresh')}
      />
    </div>
  ),
}

export const Concerns: Story = {
  name: 'Problém 🚨',
  parameters: {
    ...withReanalyzeMock,
    docs: {
      description: {
        story: 'Najzávažnejší stav — červená badge. Po rozbalení sú viditeľné dve high-severity vlajky.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <RepairVerificationWidget
        repairVerification={concernsRv}
        jobId={203}
        onRefresh={() => console.log('refresh')}
      />
    </div>
  ),
}

export const Unverifiable: Story = {
  name: 'Nejasné ❓',
  parameters: { ...withReanalyzeMock },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <RepairVerificationWidget
        repairVerification={unverifiableRv}
        jobId={204}
        onRefresh={() => console.log('refresh')}
      />
    </div>
  ),
}

export const AllStatesOverview: Story = {
  name: 'Prehľad všetkých stavov',
  parameters: {
    ...withReanalyzeMock,
    docs: {
      description: {
        story: 'Všetkých 5 stavov — prázdny, overený, výstraha, problém, nejasné — pre vizuálne porovnanie badge farieb.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0',
      }}>
        Prehľad stavov widgetu
      </div>
      <RepairVerificationWidget repairVerification={null} jobId={210} />
      <RepairVerificationWidget repairVerification={base} jobId={211} />
      <RepairVerificationWidget repairVerification={partialRv} jobId={212} />
      <RepairVerificationWidget repairVerification={concernsRv} jobId={213} />
      <RepairVerificationWidget repairVerification={unverifiableRv} jobId={214} />
    </div>
  ),
}

export const InJobCard: Story = {
  name: 'V karte zákazky (sidebar)',
  parameters: {
    ...withReanalyzeMock,
    docs: {
      description: {
        story: 'Widget ako súčasť CRM karty zákazky — zobrazuje sa v postrannom paneli.',
      },
    },
  },
  render: () => (
    <div style={{
      maxWidth: 320,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      {/* Simulated card header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
        }}>
          Zákazka #ZR-2026-0847
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Novák Miroslav — Inštalatér</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Únik vody pod dřezem · Praha 3</div>
      </div>
      {/* Status chips */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: 6, borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
          Dokončená
        </span>
        <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
          EA odoslaná
        </span>
      </div>
      {/* Repair verification widget */}
      <RepairVerificationWidget
        repairVerification={base}
        jobId={215}
        onRefresh={() => console.log('refresh')}
      />
    </div>
  ),
}
