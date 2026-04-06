import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import DiagResultPanel from './DiagResultPanel'
import type { DiagResult } from '@/types/diagnosticBrain'

const meta: Meta<typeof DiagResultPanel> = {
  title: 'Admin/DiagResultPanel',
  component: DiagResultPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Panel výsledkov diagnostiky zákazky. Zobrazuje top diagnostické scenáre s pravdepodobnosťou, odporúčané diely, pokrytie poisťovňou, požadované zručnosti technika. Voliteľne zobrazuje výsledky foto analýzy (GPT-4o vision).',
      },
    },
  },
  argTypes: {
    onRefresh: { action: 'refresh' },
  },
  beforeEach: () => {
    const original = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('diag-analyze') || url.includes('diagnostic')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(input, init)
    }
  },
}

export default meta
type Story = StoryObj<typeof DiagResultPanel>

const mockDiagResult: DiagResult = {
  topScenarios: [
    {
      id: 'plumber_leaking_pipe',
      categoryCode: 'plumber',
      title: 'Unikajúce rúrky pod umývadlom',
      description: 'Netesnosť v mieste napojenia odpadovej rúrky. Pravdepodobná príčina: opotrebovaná tesnenie alebo poškodená spojka.',
      probability: 78,
      coverageStatus: 'covered',
      estimatedHours: 1.5,
      requiredSkillLevel: 'basic',
      parts: [
        { name: 'PVC sifón DN40', type: 'nahradny_diel', qty: 1, unitPrice: 312, payer: 'insurer', partNumber: 'DN40-001' },
        { name: 'Tesniace krúžky sada', type: 'drobny_material', qty: 1, unitPrice: 80, payer: 'insurer' },
      ],
      technicianTips: ['Skontrolovať aj susedné rúrky', 'Odfotiť tesniace miesta pred a po'],
      confidence: 'high',
    },
    {
      id: 'plumber_blocked_drain',
      categoryCode: 'plumber',
      title: 'Upchatie odpadovej rúrky',
      description: 'Znížený prietok alebo úplné upchatie odpadovej rúrky. Príčina: nahromadenie tuku, vlasov alebo cudzích predmetov.',
      probability: 45,
      coverageStatus: 'likely_covered',
      estimatedHours: 1,
      requiredSkillLevel: 'basic',
      parts: [],
      technicianTips: ['Použiť hadový čistič', 'Ak nefunguje — informovať operátora o prídavných nákladoch'],
      confidence: 'medium',
    },
  ],
  analyzedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  confidence: 'high',
  categoryCode: 'plumber',
}

export const WithResults: Story = {
  name: 'S výsledkami diagnostiky',
  args: {
    diagResult: mockDiagResult,
    jobId: 42,
    onRefresh: () => console.log('Refresh'),
  },
}

export const WithPhotoAnalysis: Story = {
  name: 'S foto analýzou (GPT-4o)',
  args: {
    diagResult: mockDiagResult,
    photoAnalysis: {
      device: {
        type: 'Umývadlo',
        brand: 'Ideal Standard',
        year_of_manufacture: '2018',
        nameplate_text: 'Ideal Standard BS052301 DN40',
      },
      visible_issues: ['Viditeľný únik pod sifónom', 'Korózia na kovových spojkách'],
      recommended_parts: [
        { name: 'PVC sifón DN40', reason: 'Viditeľné poškodenie', priority: 'must_have' },
        { name: 'Tesniace krúžky', reason: 'Preventívna výmena', priority: 'likely_needed' },
      ],
      severity: 'medium',
      tech_notes: 'Potrubný systém je starší, odporúča sa kompletná kontrola.',
      confidence: 'high',
      analyzed_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      photos_analyzed: 3,
    },
    jobId: 42,
    onRefresh: () => console.log('Refresh'),
  },
}

export const NoResults: Story = {
  name: 'Žiadne výsledky',
  args: {
    diagResult: null,
    jobId: 42,
    onRefresh: () => console.log('Refresh'),
  },
}
