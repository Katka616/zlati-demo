import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import RepairVerificationPanel from './RepairVerificationPanel'
import type { RepairVerification } from './RepairVerificationPanel'

const meta: Meta<typeof RepairVerificationPanel> = {
  title: 'Admin/RepairVerificationPanel',
  component: RepairVerificationPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Full AI repair verification panel for the admin job detail view. Displays GPT-4o before/after photo analysis results: verdict, summary, red flags, parts assessment, work quality, and confidence. Supports manual re-analysis trigger.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof RepairVerificationPanel>

// ─── Mock verification data ───────────────────────────────────────────────────

const verifiedResult: RepairVerification = {
  verdict: 'verified',
  fault_resolved: {
    assessment: 'yes',
    evidence:
      'Na fotografii "po" je viditelné kompletní těsnění nového sifónu, bez kapek vlhkosti na okolních površích.',
  },
  before_after_comparison:
    'Fotografie před zákrokem ukazují prasklý PVC sifón s viditelnou vlhkostí na skříňce pod dřezem. Po opravě je namontován nový sifón DN40, okolní plochy jsou suché. Místo opravy odpovídá popisu zákazníka.',
  parts_assessment: [
    { name: 'PVC sifón DN40', visible_in_photo: 'yes', comment: 'Jasně viditelný na fotografii po opravě' },
    { name: 'Tesniace krúžky sada', visible_in_photo: 'yes', comment: 'Viditelné na detailu spoje' },
    { name: 'Teflónová páska', visible_in_photo: 'uncertain', comment: 'Pravděpodobně použita, nelze zcela potvrdit' },
  ],
  parts_match: 'consistent',
  work_quality: {
    rating: 'professional',
    observations: [
      'Spoj je čistý a bez úniku',
      'Montáž odpovídá standardům pro instalatérské práce',
      'Okolní plochy jsou po práci uklizené',
    ],
  },
  red_flags: [],
  summary:
    'Oprava úspěšně ověřena. Výměna sifónu proběhla standardně, fotografie před a po jasně dokumentují odstranění závady. Deklarovaný materiál odpovídá fotografiím.',
  confidence: 'high',
  analyzed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  before_photos_used: 2,
  after_photos_used: 3,
  parts_declared: 3,
  verification_version: '1.2',
}

const partialResult: RepairVerification = {
  verdict: 'partial',
  fault_resolved: {
    assessment: 'uncertain',
    evidence:
      'Fotografie po opravě nejsou dostatečně detailní, aby bylo možné jednoznačně potvrdit těsnost spoje.',
  },
  before_after_comparison:
    'Fotografie před opravou ukazují vlhkost pod dřezem. Fotografie po opravě jsou pořízeny z větší vzdálenosti a neposkytují dostatečný detail pro ověření kvality spoje.',
  parts_assessment: [
    { name: 'Sifón DN50', visible_in_photo: 'uncertain', comment: 'Viditelný jen zčásti, dle výměry odpovídá' },
    { name: 'Tesnenie', visible_in_photo: 'no', comment: 'Těsnění není viditelné na žádné fotografii' },
  ],
  parts_match: 'partially_consistent',
  work_quality: {
    rating: 'acceptable',
    observations: [
      'Práce byla provedena, ale fotodokumentace je nedostatečná',
      'Doporučujeme doplnit detail fotografií spoje',
    ],
  },
  red_flags: [
    {
      type: 'NEDOSTATOČNÁ DOKUMENTÁCIA',
      description:
        'Fotografie po opravě neposkytují dostatečný detail pro kompletní ověření. Doporučujeme kontaktovat technika pro doplnění.',
      severity: 'medium',
    },
  ],
  summary:
    'Zákazka částečně ověřena. Oprava pravděpodobně proběhla, ale fotodokumentace je nedostatečná pro úplné potvrzení. Doporučena kontrola.',
  confidence: 'medium',
  analyzed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  before_photos_used: 2,
  after_photos_used: 1,
  parts_declared: 2,
  verification_version: '1.2',
}

const concernsResult: RepairVerification = {
  verdict: 'concerns',
  fault_resolved: {
    assessment: 'uncertain',
    evidence:
      'Fotografie po opravě ukazují jiné místo než závada popsaná zákazníkem. Místo úniku pod dřezem není na žádné fotografii.',
  },
  before_after_comparison:
    'Fotografie před zákazkou dokumentují únik vody u dřezu. Fotografie po zákazce zachycují koupelnu — nesouvisí s popsanou závadou v kuchyni.',
  parts_assessment: [
    { name: 'Sifón DN40', visible_in_photo: 'no', comment: 'Deklarovaný sifón není na žádné fotografii viditelný' },
    { name: 'Těsnění 3ks', visible_in_photo: 'no', comment: 'Neviditelné' },
  ],
  parts_match: 'inconsistent',
  work_quality: {
    rating: 'cannot_assess',
    observations: [],
  },
  red_flags: [
    {
      type: 'NESÚLAD MIESTA OPRAVY',
      description:
        'Fotografie zachycují jiné místnosti než popsaná závada. Nelze ověřit, zda byla závada skutečně opravena.',
      severity: 'high',
    },
    {
      type: 'DEKLAROVANÝ MATERIÁL CHÝBA',
      description:
        'Žádný z deklarovaných dílů (sifón DN40, těsnění) není viditelný na fotografiích po opravě.',
      severity: 'high',
    },
    {
      type: 'NEDOSTATOČNÁ DOKUMENTÁCIA',
      description: 'Fotografie po zákazce neobsahují záběry místa závady.',
      severity: 'medium',
    },
  ],
  summary:
    'Nalezeny závažné nesrovnalosti. Fotografie po opravě nesouvisí s popsanou závadou. Deklarovaný materiál není viditelný. Doporučena okamžitá kontrola zákazky.',
  confidence: 'high',
  analyzed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  before_photos_used: 2,
  after_photos_used: 2,
  parts_declared: 2,
  verification_version: '1.2',
}

const unverifiableResult: RepairVerification = {
  verdict: 'unverifiable',
  fault_resolved: {
    assessment: 'uncertain',
    evidence: 'Žiadne fotografie neboli priložené k zákazke.',
  },
  before_after_comparison: 'Neboli poskytnuté žiadne fotografie pred ani po oprave.',
  parts_assessment: [],
  parts_match: 'cannot_assess',
  work_quality: {
    rating: 'cannot_assess',
    observations: ['Bez fotografií nie je možné posúdiť kvalitu práce'],
  },
  red_flags: [],
  summary: 'Overenie nie je možné — chýbajú fotografie. Zákazka nemôže byť automaticky overená.',
  confidence: 'low',
  analyzed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  before_photos_used: 0,
  after_photos_used: 0,
  parts_declared: 0,
  verification_version: '1.2',
}

// Tiny coloured placeholder images (before=blue tint, after=green tint)
const PLACEHOLDER_BEFORE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAS0lEQVQY02NgYGD4z0ABYGD4/59CRQwMDAxMFCoAGc9AoQIGBgYGBgoVMTAwMPynUBEDAwMDA4WKGBgYGBgoVMTAwMDAQKEiAADCIg1YBoTFwwAAAABJRU5ErkJggg=='
const PLACEHOLDER_AFTER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAASklEQVQY02NgYGD4z0ABYGBg+E+hIgYGBgYmChUwMDAwMFCoiIGBgYGBQkUMDAwMDBQqYmBgYGCgUBEDAwMDA4WKGBgYGBgoVAQAkHANVlJ2NKAAAAAASUVORK5CYII='

const mockBeforePhotos = [
  { id: 1, filename: 'pred_opravou_1.jpg', data: PLACEHOLDER_BEFORE },
  { id: 2, filename: 'pred_opravou_2.jpg', data: PLACEHOLDER_BEFORE },
]
const mockAfterPhotos = [
  { id: 3, filename: 'po_oprave_1.jpg', data: PLACEHOLDER_AFTER },
  { id: 4, filename: 'po_oprave_2.jpg', data: PLACEHOLDER_AFTER },
  { id: 5, filename: 'po_oprave_3.jpg', data: PLACEHOLDER_AFTER },
]

// ─── Fetch mock for re-analyze button ─────────────────────────────────────────

function withReanalyzeMock(delayMs = 1200) {
  return {
    beforeEach() {
      const original = window.fetch
      window.fetch = async () => {
        await new Promise(r => setTimeout(r, delayMs))
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

export const Verified: Story = {
  name: 'Oprava overená ✅',
  parameters: {
    ...withReanalyzeMock(),
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={verifiedResult}
      jobId={101}
      beforePhotos={mockBeforePhotos}
      afterPhotos={mockAfterPhotos}
      onRefresh={() => console.log('refresh')}
    />
  ),
}

export const Partial: Story = {
  name: 'Čiastočne overené ⚠️',
  parameters: {
    ...withReanalyzeMock(),
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={partialResult}
      jobId={102}
      beforePhotos={mockBeforePhotos}
      afterPhotos={mockAfterPhotos}
      onRefresh={() => console.log('refresh')}
    />
  ),
}

export const Concerns: Story = {
  name: 'Závažné nezrovnalosti 🚨',
  parameters: {
    ...withReanalyzeMock(),
    docs: {
      description: {
        story:
          'Najzávažnejší stav — fotografie nezodpovedajú zákazke, deklarovaný materiál chýba. Zobrazené sú 3 červené vlajky.',
      },
    },
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={concernsResult}
      jobId={103}
      onRefresh={() => console.log('refresh')}
    />
  ),
}

export const Unverifiable: Story = {
  name: 'Nie je možné overiť ❓',
  parameters: {
    ...withReanalyzeMock(),
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={unverifiableResult}
      jobId={104}
      onRefresh={() => console.log('refresh')}
    />
  ),
}

export const EmptyState: Story = {
  name: 'Prázdny stav — overenie ešte neprebehlo',
  parameters: {
    ...withReanalyzeMock(),
    docs: {
      description: {
        story:
          'Stav pred prvým spustením analýzy. Protokol ešte nebol odoslaný alebo analýza nebola spustená. Tlačidlo "Spustit ověření" je aktívne.',
      },
    },
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={null}
      jobId={105}
      onRefresh={() => console.log('refresh')}
    />
  ),
}

export const WithoutPhotos: Story = {
  name: 'Bez priložených fotografií',
  parameters: {
    ...withReanalyzeMock(),
    docs: {
      description: {
        story: 'Overený výsledok, ale bez before/after fotografií — sekcia porovnania obsahuje len text, nie náhľady.',
      },
    },
  },
  render: () => (
    <RepairVerificationPanel
      repairVerification={verifiedResult}
      jobId={106}
      onRefresh={() => console.log('refresh')}
    />
  ),
}
