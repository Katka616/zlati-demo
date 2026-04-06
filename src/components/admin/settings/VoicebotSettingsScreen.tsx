'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { VoicebotPrompt } from '@/types/voicebot'
import { apiFetch } from '@/lib/apiFetch'
import type { VoicebotConfig, CustomScenario } from '@/lib/voicebotConfigTypes'
import { VOICEBOT_CONFIG_DEFAULTS, DEFAULT_MANUAL_SCENARIOS } from '@/lib/voicebotConfigTypes'

// ─── Constants ────────────────────────────────────────────────────────────────

const INBOUND_PROMPTS = [
  { value: 'inbound_client',  label: '👤 Zákazník',  color: '#2563eb' },
  { value: 'inbound_tech',    label: '🔧 Technik',   color: '#0891b2' },
  { value: 'inbound_unknown', label: '❓ Neznámy',   color: '#6b7280' },
]

const LANGUAGES = [
  { value: 'cs', label: '🇨🇿 Čeština', flag: 'CZ' },
  { value: 'sk', label: '🇸🇰 Slovenčina', flag: 'SK' },
  { value: 'en', label: '🇬🇧 Angličtina', flag: 'EN' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'cs' | 'sk' | 'en'
type CallerType = 'client' | 'technician' | 'unknown'

type GreetingsData = Record<CallerType, Record<Lang, string>>

interface AutomatedScenario {
  key: string
  label: string
  emoji: string
  description: string
  recipient: 'customer' | 'technician' | 'both'
  trigger: {
    enabled: boolean
    delay_minutes: number
    max_attempts: number
    retry_delay_minutes: number
  }
}

const EMPTY_GREETINGS: GreetingsData = {
  client: { cs: '', sk: '', en: '' },
  technician: { cs: '', sk: '', en: '' },
  unknown: { cs: '', sk: '', en: '' },
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  tabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid var(--g2, #E5E7EB)',
    marginBottom: 28,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  tab: (active: boolean) => ({
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? 'var(--gold, #BF953F)' : 'var(--g5, #6B7280)',
    borderBottom: active ? '2px solid var(--gold, #BF953F)' : '2px solid transparent',
    marginBottom: -2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    whiteSpace: 'nowrap' as const,
    transition: 'color 0.15s',
  } as React.CSSProperties),

  section: {
    marginBottom: 36,
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--dark, #1A1A1A)',
    margin: '0 0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,

  langTabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  } as React.CSSProperties,

  langTab: (active: boolean) => ({
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? '#fff' : 'var(--g5, #6B7280)',
    background: active ? 'var(--gold, #BF953F)' : 'var(--g1, #F3F4F6)',
    border: '1px solid',
    borderColor: active ? 'var(--gold, #BF953F)' : 'var(--g3, #D1D5DB)',
    borderRadius: 20,
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'all 0.15s',
  } as React.CSSProperties),

  card: {
    background: '#fff',
    border: '1px solid var(--g2, #E5E7EB)',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    marginBottom: 16,
  } as React.CSSProperties,

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--g3, #D1D5DB)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--dark, #1A1A1A)',
    fontFamily: 'monospace, "Courier New"',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 200,
    lineHeight: 1.65,
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,

  hint: {
    fontSize: 11,
    color: 'var(--g5, #6B7280)',
    margin: '6px 0 0',
    lineHeight: 1.5,
  } as React.CSSProperties,

  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 12,
  } as React.CSSProperties,

  btnSave: (saving: boolean) => ({
    padding: '8px 22px',
    background: saving ? 'var(--g3, #D1D5DB)' : 'var(--gold, #BF953F)',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    cursor: saving ? 'not-allowed' : 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'background 0.15s',
  } as React.CSSProperties),

  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--g5, #6B7280)',
    fontSize: 14,
  } as React.CSSProperties,

  infoBox: {
    background: 'var(--g1, #F9F9F7)',
    border: '1px solid var(--g2, #E5E7EB)',
    borderLeft: '4px solid var(--gold, #BF953F)',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 12,
    color: 'var(--g6, #4B5563)',
    lineHeight: 1.6,
    marginBottom: 20,
  } as React.CSSProperties,
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoicebotSettingsScreen() {
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'prompts' | 'scenarios' | 'config'>('prompts')
  const [activeLang, setActiveLang] = useState<Lang>('cs')

  // Data
  const [prompts, setPrompts] = useState<VoicebotPrompt[]>([])
  const [greetings, setGreetings] = useState<GreetingsData>(EMPTY_GREETINGS)
  const [config, setConfig] = useState<VoicebotConfig>(VOICEBOT_CONFIG_DEFAULTS)
  const [configSaving, setConfigSaving] = useState(false)
  const [automatedScenarios, setAutomatedScenarios] = useState<AutomatedScenario[]>([])
  const [manualScenarios, setManualScenarios] = useState<CustomScenario[]>(DEFAULT_MANUAL_SCENARIOS)
  const [triggerSaving, setTriggerSaving] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Per-prompt edit state: key = `${scenario}:${lang}`
  const [editTexts, setEditTexts] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [greetingSaving, setGreetingSaving] = useState(false)

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [promptsRes, greetingsRes, configRes, scenariosRes] = await Promise.all([
        fetch('/api/admin/voicebot/prompts'),
        fetch('/api/admin/voicebot/greetings'),
        fetch('/api/admin/voicebot/config'),
        fetch('/api/admin/voicebot/scenarios'),
      ])

      if (promptsRes.ok) {
        const data = await promptsRes.json()
        setPrompts(data.prompts ?? [])
        const texts: Record<string, string> = {}
        for (const p of (data.prompts ?? []) as VoicebotPrompt[]) {
          texts[`${p.scenario}:${p.language}`] = p.prompt_text
        }
        setEditTexts(texts)
      }

      if (greetingsRes.ok) {
        const data = await greetingsRes.json()
        setGreetings(data.greetings ?? EMPTY_GREETINGS)
      }

      if (configRes.ok) {
        const data = await configRes.json()
        if (data.config) setConfig(data.config)
      }

      if (scenariosRes.ok) {
        const data = await scenariosRes.json()
        if (Array.isArray(data.automated)) setAutomatedScenarios(data.automated)
        if (Array.isArray(data.manual)) setManualScenarios(data.manual)
      }
    } catch (err) {
      console.error(err)
      showToast('Chyba pri načítaní nastavení', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadData() }, [loadData])

  // ─── Prompt save ────────────────────────────────────────────────────────────

  async function savePrompt(scenario: string, language: string) {
    const key = `${scenario}:${language}`
    const text = editTexts[key] ?? ''
    if (!text.trim()) {
      showToast('Prompt nesmie byť prázdny', { type: 'error' })
      return
    }

    setSavingKey(key)
    try {
      const data = await apiFetch<{ prompt: VoicebotPrompt }>('/api/admin/voicebot/prompts', {
        method: 'POST',
        body: { scenario, language, prompt_text: text },
      })
      setPrompts(prev => {
        const idx = prev.findIndex(p => p.scenario === scenario && p.language === language)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = data.prompt
          return next
        }
        return [...prev, data.prompt]
      })
      showToast('Prompt bol uložený', { type: 'success' })
    } catch {
      showToast('Chyba pri ukladaní promptu', { type: 'error' })
    } finally {
      setSavingKey(null)
    }
  }

  // ─── Greeting save ──────────────────────────────────────────────────────────

  async function saveGreeting(callerType: CallerType, language: Lang) {
    const text = greetings[callerType]?.[language] ?? ''
    if (!text.trim()) {
      showToast('Greeting nesmie byť prázdny', { type: 'error' })
      return
    }

    setGreetingSaving(true)
    try {
      await apiFetch('/api/admin/voicebot/greetings', {
        method: 'POST',
        body: { caller_type: callerType, language, greeting_text: text },
      })
      showToast('Greeting bol uložený', { type: 'success' })
    } catch {
      showToast('Chyba pri ukladaní greetingu', { type: 'error' })
    } finally {
      setGreetingSaving(false)
    }
  }

  // ─── Trigger save ─────────────────────────────────────────────────────────

  async function saveTriggerConfig() {
    setTriggerSaving(true)
    try {
      const patch: Record<string, { enabled: boolean; delay_minutes: number; max_attempts: number; retry_delay_minutes: number }> = {}
      for (const s of automatedScenarios) {
        patch[s.key] = s.trigger
      }
      await apiFetch('/api/admin/voicebot/triggers', { method: 'POST', body: patch })
      showToast('Triggery uložené', { type: 'success' })
    } catch {
      showToast('Chyba pri ukladaní triggerov', { type: 'error' })
    } finally {
      setTriggerSaving(false)
    }
  }

  // ─── Manual scenarios save ────────────────────────────────────────────────

  async function saveManualScenarios() {
    setManualSaving(true)
    try {
      await apiFetch('/api/admin/voicebot/scenarios', {
        method: 'POST',
        body: { manual: manualScenarios },
      })
      showToast('Scenáre uložené', { type: 'success' })
    } catch {
      showToast('Chyba pri ukladaní scenárov', { type: 'error' })
    } finally {
      setManualSaving(false)
    }
  }

  async function deleteAndSaveScenario(key: string) {
    const updated = manualScenarios.filter(s => s.key !== key)
    setManualScenarios(updated)
    setManualSaving(true)
    try {
      await apiFetch('/api/admin/voicebot/scenarios', {
        method: 'POST',
        body: { manual: updated },
      })
      showToast('Scenár bol odstránený', { type: 'success' })
    } catch {
      showToast('Chyba pri odstraňovaní scenára', { type: 'error' })
      setManualScenarios(manualScenarios) // rollback
    } finally {
      setManualSaving(false)
    }
  }

  // ─── Config save ─────────────────────────────────────────────────────────

  async function saveConfig(patch: Partial<VoicebotConfig>) {
    setConfigSaving(true)
    try {
      const data = await apiFetch<{ config?: VoicebotConfig }>('/api/admin/voicebot/config', {
        method: 'POST',
        body: patch,
      })
      if (data.config) setConfig(data.config)
      showToast('Nastavenia uložené', { type: 'success' })
    } catch {
      showToast('Chyba pri ukladaní nastavení', { type: 'error' })
    } finally {
      setConfigSaving(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Main tabs */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'prompts')} onClick={() => setActiveTab('prompts')}>
          📲 Prichádzajúce hovory
        </button>
        <button style={S.tab(activeTab === 'scenarios')} onClick={() => setActiveTab('scenarios')}>
          📞 Odchádzajúce scenáre
        </button>
        <button style={S.tab(activeTab === 'config')} onClick={() => setActiveTab('config')}>
          ⚙️ Nastavenia
        </button>
      </div>

      {loading ? (
        <div style={S.loading}>⏳ Načítavam…</div>
      ) : activeTab === 'prompts' ? (
        <PromptsTab
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          editTexts={editTexts}
          setEditTexts={setEditTexts}
          savingKey={savingKey}
          savePrompt={savePrompt}
          greetings={greetings}
          setGreetings={setGreetings}
          greetingSaving={greetingSaving}
          saveGreeting={saveGreeting}
        />
      ) : activeTab === 'scenarios' ? (
        <ScenariosTab
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          automatedScenarios={automatedScenarios}
          setAutomatedScenarios={setAutomatedScenarios}
          manualScenarios={manualScenarios}
          setManualScenarios={setManualScenarios}
          editTexts={editTexts}
          setEditTexts={setEditTexts}
          savingKey={savingKey}
          savePrompt={savePrompt}
          triggerSaving={triggerSaving}
          saveTriggerConfig={saveTriggerConfig}
          manualSaving={manualSaving}
          saveManualScenarios={saveManualScenarios}
          deleteAndSaveScenario={deleteAndSaveScenario}
        />
      ) : (
        <ConfigTab
          config={config}
          setConfig={setConfig}
          saving={configSaving}
          saveConfig={saveConfig}
        />
      )}
    </div>
  )
}

// ─── Prompts Tab (inbound only) ───────────────────────────────────────────────

const INBOUND_TO_CALLER_TYPE: Record<string, CallerType> = {
  inbound_client:  'client',
  inbound_tech:    'technician',
  inbound_unknown: 'unknown',
}

function PromptsTab({
  activeLang,
  setActiveLang,
  editTexts,
  setEditTexts,
  savingKey,
  savePrompt,
  greetings,
  setGreetings,
  greetingSaving,
  saveGreeting,
}: {
  activeLang: Lang
  setActiveLang: (l: Lang) => void
  editTexts: Record<string, string>
  setEditTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  savingKey: string | null
  savePrompt: (s: string, l: string) => Promise<void>
  greetings: GreetingsData
  setGreetings: React.Dispatch<React.SetStateAction<GreetingsData>>
  greetingSaving: boolean
  saveGreeting: (t: CallerType, l: Lang) => Promise<void>
}) {
  const [activeScenario, setActiveScenario] = useState(INBOUND_PROMPTS[0].value)

  const activeItem = INBOUND_PROMPTS.find(i => i.value === activeScenario)
  const key = `${activeScenario}:${activeLang}`
  const text = editTexts[key] ?? ''
  const saving = savingKey === key
  const callerType = INBOUND_TO_CALLER_TYPE[activeScenario] ?? 'unknown'
  const greetingText = greetings[callerType]?.[activeLang] ?? ''

  return (
    <div>
      <div style={S.infoBox}>
        <strong>Prichádzajúci hovor</strong> — AI použije tento prompt bez ohľadu na stav zákazky.
        Jeden prompt pre každý typ volajúceho. Kontext zákazky sa vkladá automaticky.
      </div>

      {/* Scenario selector */}
      <div style={{ ...S.section, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {INBOUND_PROMPTS.map(item => (
            <button
              key={item.value}
              onClick={() => setActiveScenario(item.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: activeScenario === item.value ? '#fff' : 'transparent',
                border: `1px solid ${activeScenario === item.value ? 'var(--g3, #D1D5DB)' : 'transparent'}`,
                borderLeft: `4px solid ${activeScenario === item.value ? item.color : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13,
                fontWeight: activeScenario === item.value ? 700 : 500,
                color: 'var(--dark, #1A1A1A)',
                textAlign: 'left',
                boxShadow: activeScenario === item.value ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt editor */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            background: activeItem?.color ?? '#6b7280',
            padding: '4px 12px',
            borderRadius: 20,
          }}>
            {activeItem?.label ?? activeScenario}
          </span>
        </div>

        <div style={S.langTabs}>
          {LANGUAGES.map(l => (
            <button key={l.value} style={S.langTab(activeLang === l.value)} onClick={() => setActiveLang(l.value as Lang)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            👋 Uvítacia hláška
          </div>
          <textarea
            style={{ ...S.textarea, minHeight: 'unset', fontFamily: "'Montserrat', sans-serif", fontSize: 13 }}
            value={greetingText}
            placeholder="Prvá veta po zdvihnutí hovoru…"
            onChange={e =>
              setGreetings(prev => ({
                ...prev,
                [callerType]: { ...prev[callerType], [activeLang]: e.target.value },
              }))
            }
            rows={3}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={S.btnSave(greetingSaving)} disabled={greetingSaving} onClick={() => saveGreeting(callerType, activeLang)}>
              {greetingSaving ? '⏳ Ukladám…' : '💾 Uložiť uvítaciu správu'}
            </button>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--g2, #E5E7EB)', margin: '20px 0 16px' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🤖 Systémový prompt
          </div>
        </div>

        <textarea
          style={S.textarea}
          value={text}
          placeholder={`Zadajte systémový prompt — ${activeItem?.label ?? activeScenario} · ${LANGUAGES.find(l => l.value === activeLang)?.label}…`}
          onChange={e => setEditTexts(prev => ({ ...prev, [key]: e.target.value }))}
          rows={14}
        />
        <p style={S.hint}>Kontext zákazky sa vkladá automaticky za prompt pri každom hovore.</p>

        <div style={S.cardFooter}>
          <button style={S.btnSave(saving)} disabled={saving} onClick={() => savePrompt(activeScenario, activeLang)}>
            {saving ? '⏳ Ukladám…' : '💾 Uložiť prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Scenarios Tab ────────────────────────────────────────────────────────────

// Tooltip data for automated trigger scenarios
const TRIGGER_TOOLTIPS: Record<string, (cfg: { delay_minutes: number; max_attempts: number }) => string[]> = {
  client_diagnostic: ({ delay_minutes, max_attempts }) => [
    '📋 Podmienka: zákazka je v stave „Príjem" a zákazník ešte nevyplnil diagnostický dotazník.',
    '📞 Voicebot zavolá zákazníkovi a prevedie ho diagnostikou — aká je závada, čo sa stalo, čo potrebuje opraviť.',
    `⏱ Čakanie: ${delay_minutes} min od vytvorenia zákazky — ak zákazník za tento čas nevyplní formulár, spustí sa hovor.`,
    `🔁 Max. pokusov: voicebot zavolá zákazníka najviac ${max_attempts}×, potom prestane.`,
    '✅ Hovor sa zruší, ak zákazník medzitým formulár vyplní alebo zákazka postúpi ďalej.',
  ],
  tech_dispatch: ({ delay_minutes, max_attempts }) => [
    '📋 Podmienka: urgentná zákazka v stave „Dispatching", žiadny technik neakceptoval ponuku.',
    '📞 Sekvenčné volanie: voicebot zavolá prvému dostupnému technikovi. Ak odmietne alebo neodpovie, zavolá ďalšiemu.',
    `⏱ Čakanie: ${delay_minutes} min od odoslania notifikácií.`,
    `🔁 Max. pokusov: celkovo najviac ${max_attempts} hovorov pre jednu zákazku.`,
    '✅ Volanie sa zastaví, ak technik akceptuje zákazku alebo operátor priradí technika manuálne.',
  ],
  client_schedule: ({ delay_minutes, max_attempts }) => [
    '📋 Podmienka: zákazka je v stave „Naplánované" a zákazník ešte nepotvrdil termín návštevy.',
    '📞 Voicebot zavolá zákazníkovi, oznámi navrhnutý termín a opýta sa, či mu vyhovuje.',
    `⏱ Čakanie: ${delay_minutes} min od navrhnutia termínu.`,
    `🔁 Max. pokusov: voicebot kontaktuje zákazníka najviac ${max_attempts}× ohľadom potvrdenia termínu.`,
    '✅ Hovor sa zruší, ak zákazník termín potvrdí alebo zákazka postúpi ďalej.',
  ],
  client_surcharge: ({ delay_minutes, max_attempts }) => [
    '📋 Podmienka: zákazka čaká na schválenie doplatku zákazníkom.',
    '📞 Voicebot zavolá zákazníkovi, vysvetlí výšku doplatku a opýta sa, či súhlasí.',
    `⏱ Čakanie: ${delay_minutes} min od odoslania cenovej ponuky.`,
    `🔁 Max. pokusov: voicebot kontaktuje zákazníka najviac ${max_attempts}× kvôli schváleniu doplatku.`,
    '✅ Hovor sa zruší, ak zákazník doplatok schváli alebo odmietne priamo cez portál.',
  ],
  client_protocol: ({ delay_minutes, max_attempts }) => [
    '📋 Podmienka: protokol o dokončení práce bol odoslaný zákazníkovi, ale zákazník ho ešte nepodpísal.',
    '📞 Voicebot zavolá zákazníkovi, upozorní ho na čakajúci protokol a požiada o podpis.',
    `⏱ Čakanie: ${delay_minutes} min od odoslania protokolu.`,
    `🔁 Max. pokusov: voicebot kontaktuje zákazníka najviac ${max_attempts}× kvôli podpisu protokolu.`,
    '✅ Hovor sa zruší, ak zákazník protokol podpíše alebo zákazka postúpi do zúčtovania.',
  ],
}

function ScenariosTab({
  activeLang,
  setActiveLang,
  automatedScenarios,
  setAutomatedScenarios,
  manualScenarios,
  setManualScenarios,
  editTexts,
  setEditTexts,
  savingKey,
  savePrompt,
  triggerSaving,
  saveTriggerConfig,
  manualSaving,
  saveManualScenarios,
  deleteAndSaveScenario,
}: {
  activeLang: Lang
  setActiveLang: (l: Lang) => void
  automatedScenarios: AutomatedScenario[]
  setAutomatedScenarios: React.Dispatch<React.SetStateAction<AutomatedScenario[]>>
  manualScenarios: CustomScenario[]
  setManualScenarios: React.Dispatch<React.SetStateAction<CustomScenario[]>>
  editTexts: Record<string, string>
  setEditTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  savingKey: string | null
  savePrompt: (s: string, l: string) => Promise<void>
  triggerSaving: boolean
  saveTriggerConfig: () => Promise<void>
  manualSaving: boolean
  saveManualScenarios: () => Promise<void>
  deleteAndSaveScenario: (key: string) => Promise<void>
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(
    automatedScenarios[0]?.key ?? manualScenarios[0]?.key ?? null
  )

  // Sync initial selection when data loads
  React.useEffect(() => {
    if (!selectedKey && automatedScenarios.length > 0) {
      setSelectedKey(automatedScenarios[0].key)
    }
  }, [automatedScenarios, selectedKey])

  const selectedAutomated = automatedScenarios.find(s => s.key === selectedKey)
  const selectedManual = manualScenarios.find(s => s.key === selectedKey)

  const numInput: React.CSSProperties = {
    padding: '6px 10px',
    border: '1px solid var(--g3, #D1D5DB)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--dark, #1A1A1A)',
    background: '#fff',
    fontFamily: "'Montserrat', sans-serif",
    outline: 'none',
    width: 72,
    boxSizing: 'border-box',
  }

  const recipientLabel = (r: 'customer' | 'technician' | 'both') =>
    r === 'customer' ? 'Zákazník' : r === 'technician' ? 'Technik' : 'Obidvaja'

  const recipientColor = (r: 'customer' | 'technician' | 'both') => ({
    customer:    { bg: '#EFF6FF', color: '#2563EB' },
    technician:  { bg: '#F0FDF4', color: '#16A34A' },
    both:        { bg: '#FEF9C3', color: '#854D0E' },
  }[r])

  const sidebarItem = (key: string, label: string, badge?: React.ReactNode, extra?: React.ReactNode) => (
    <div
      key={key}
      onClick={() => setSelectedKey(key)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        cursor: 'pointer',
        borderRadius: 8,
        background: selectedKey === key ? '#fff' : 'transparent',
        border: `1px solid ${selectedKey === key ? 'var(--g3, #D1D5DB)' : 'transparent'}`,
        boxShadow: selectedKey === key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        marginBottom: 4,
        transition: 'all 0.1s',
      }}
    >
      <span style={{
        fontSize: 13,
        fontWeight: selectedKey === key ? 700 : 500,
        color: 'var(--dark, #1A1A1A)',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {badge}
        {extra}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <div>
        {/* Automated section */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g5, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, padding: '0 4px' }}>
          🤖 Automatické triggery
        </div>
        {automatedScenarios.map(s => (
          <div
            key={s.key}
            onClick={() => setSelectedKey(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              cursor: 'pointer',
              borderRadius: 8,
              background: selectedKey === s.key ? '#fff' : 'transparent',
              border: `1px solid ${selectedKey === s.key ? 'var(--g3, #D1D5DB)' : 'transparent'}`,
              boxShadow: selectedKey === s.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: selectedKey === s.key ? 700 : 500, color: 'var(--dark, #1A1A1A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 6 }}>
              <Toggle
                value={s.trigger.enabled}
                onChange={v => setAutomatedScenarios(prev =>
                  prev.map(x => x.key === s.key ? { ...x, trigger: { ...x.trigger, enabled: v } } : x)
                )}
              />
            </div>
          </div>
        ))}

        {/* Manual section */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g5, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, padding: '0 4px', borderTop: '1px solid var(--g2, #E5E7EB)', paddingTop: 16 }}>
          📞 Manuálne scenáre
        </div>

        {manualScenarios.map(s => {
          const rc = recipientColor(s.recipient)
          return sidebarItem(
            s.key,
            s.label,
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: rc.bg, color: rc.color, whiteSpace: 'nowrap' }}>
              {recipientLabel(s.recipient)}
            </span>
          )
        })}

        <button
          onClick={() => {
            const newKey = `custom_${Date.now()}`
            const newScenario: CustomScenario = { key: newKey, label: 'Nový scenár', recipient: 'both' }
            setManualScenarios(prev => [...prev, newScenario])
            setSelectedKey(newKey)
          }}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '8px 12px',
            background: 'var(--gold-bg, #FBF6EB)',
            color: 'var(--gold-dark, #aa771c)',
            border: '1px dashed var(--gold, #bf953f)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          + Pridať scenár
        </button>
      </div>

      {/* ── Right: editor ────────────────────────────────────────────────────── */}
      <div>
        {!selectedKey && (
          <div style={S.loading}>Vyberte scenár zo zoznamu</div>
        )}

        {/* ── Automated scenario editor ─────────────────────────────────────── */}
        {selectedAutomated && (() => {
          const s = selectedAutomated
          const tooltipFn = TRIGGER_TOOLTIPS[s.key]
          const key = `${s.key}:${activeLang}`
          const text = editTexts[key] ?? ''
          const saving = savingKey === key
          const disabled = !s.trigger.enabled

          return (
            <div>
              {/* Header */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ fontSize: 32, lineHeight: 1, marginTop: 2, opacity: disabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>{s.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark, #1A1A1A)', opacity: disabled ? 0.4 : 1 }}>{s.label}</div>
                        {tooltipFn && <TriggerTooltip lines={tooltipFn(s.trigger)} />}
                      </div>
                      <Toggle
                        value={s.trigger.enabled}
                        onChange={v => setAutomatedScenarios(prev =>
                          prev.map(x => x.key === s.key ? { ...x, trigger: { ...x.trigger, enabled: v } } : x)
                        )}
                      />
                    </div>
                    <p style={{ ...S.hint, marginBottom: 16, opacity: disabled ? 0.4 : 1 }}>{s.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, opacity: disabled ? 0.4 : 1 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g5, #6B7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Čakanie bez odozvy
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NumericInput
                            min={5} max={1440}
                            style={{ ...numInput, pointerEvents: disabled ? 'none' : 'auto' }}
                            value={s.trigger.delay_minutes}
                            onChange={n => setAutomatedScenarios(prev =>
                              prev.map(x => x.key === s.key ? { ...x, trigger: { ...x.trigger, delay_minutes: n } } : x)
                            )}
                          />
                          <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>
                            minút{s.trigger.delay_minutes >= 60 ? ` (${(s.trigger.delay_minutes / 60).toFixed(1).replace('.0', '')} hod)` : ''}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g5, #6B7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Max. pokusov
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NumericInput
                            min={1} max={10}
                            style={{ ...numInput, pointerEvents: disabled ? 'none' : 'auto' }}
                            value={s.trigger.max_attempts}
                            onChange={n => setAutomatedScenarios(prev =>
                              prev.map(x => x.key === s.key ? { ...x, trigger: { ...x.trigger, max_attempts: n } } : x)
                            )}
                          />
                          <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>pokusov</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g5, #6B7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Čakanie pred opakovaním
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NumericInput
                            min={5} max={1440}
                            style={{ ...numInput, pointerEvents: disabled ? 'none' : 'auto' }}
                            value={s.trigger.retry_delay_minutes}
                            onChange={n => setAutomatedScenarios(prev =>
                              prev.map(x => x.key === s.key ? { ...x, trigger: { ...x.trigger, retry_delay_minutes: n } } : x)
                            )}
                          />
                          <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>
                            minút{s.trigger.retry_delay_minutes >= 60 ? ` (${(s.trigger.retry_delay_minutes / 60).toFixed(1).replace('.0', '')} hod)` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ ...S.cardFooter, marginTop: 16 }}>
                  <button style={S.btnSave(triggerSaving)} disabled={triggerSaving} onClick={saveTriggerConfig}>
                    {triggerSaving ? '⏳ Ukladám…' : '💾 Uložiť trigger'}
                  </button>
                </div>
              </div>

              {/* Prompt editor */}
              <div style={S.card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🤖 Systémový prompt
                </div>
                <div style={S.langTabs}>
                  {LANGUAGES.map(l => (
                    <button key={l.value} style={S.langTab(activeLang === l.value)} onClick={() => setActiveLang(l.value as Lang)}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <textarea
                  style={S.textarea}
                  value={text}
                  placeholder={`Systémový prompt pre scenár „${s.label}" · ${LANGUAGES.find(l => l.value === activeLang)?.label}…`}
                  onChange={e => setEditTexts(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={14}
                />
                <p style={S.hint}>Kontext zákazky sa vkladá automaticky. Operátor môže doplniť pokyn pri manuálnom spustení.</p>
                <div style={S.cardFooter}>
                  <button style={S.btnSave(saving)} disabled={saving} onClick={() => savePrompt(s.key, activeLang)}>
                    {saving ? '⏳ Ukladám…' : '💾 Uložiť prompt'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Manual scenario editor ────────────────────────────────────────── */}
        {selectedManual && (() => {
          const s = selectedManual
          const isCustom = !s.is_builtin
          const key = `${s.key}:${activeLang}`
          const text = editTexts[key] ?? ''
          const saving = savingKey === key

          return (
            <div>
              {/* Metadata card */}
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Názov scenára
                    </div>
                    {isCustom ? (
                      <input
                        type="text"
                        value={s.label}
                        maxLength={80}
                        onChange={e => setManualScenarios(prev =>
                          prev.map(x => x.key === s.key ? { ...x, label: e.target.value } : x)
                        )}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--g3, #D1D5DB)',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--dark, #1A1A1A)',
                          fontFamily: "'Montserrat', sans-serif",
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark, #1A1A1A)' }}>{s.label}</div>
                    )}
                  </div>
                  {isCustom && (
                    <button
                      onClick={() => {
                        if (!window.confirm(`Odstrániť scenár „${s.label}"?`)) return
                        deleteAndSaveScenario(s.key)
                        setSelectedKey(null)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--danger-bg, #FEF2F2)',
                        color: 'var(--danger, #EF4444)',
                        border: '1px solid var(--danger, #EF4444)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Montserrat', sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      🗑 Odstrániť
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Kto je volaný
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['customer', 'technician', 'both'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setManualScenarios(prev =>
                        prev.map(x => x.key === s.key ? { ...x, recipient: r } : x)
                      )}
                      style={{
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: s.recipient === r ? 700 : 500,
                        color: s.recipient === r ? '#fff' : 'var(--g6, #4B5563)',
                        background: s.recipient === r ? 'var(--gold, #BF953F)' : 'var(--g1, #F3F4F6)',
                        border: `1px solid ${s.recipient === r ? 'var(--gold, #BF953F)' : 'var(--g3, #D1D5DB)'}`,
                        borderRadius: 20,
                        cursor: 'pointer',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      {r === 'customer' ? '👤 Zákazník' : r === 'technician' ? '🔧 Technik' : '👥 Obidvaja'}
                    </button>
                  ))}
                </div>

                {isCustom && (
                  <div style={{ ...S.cardFooter, marginTop: 16 }}>
                    <button style={S.btnSave(manualSaving)} disabled={manualSaving} onClick={saveManualScenarios}>
                      {manualSaving ? '⏳ Ukladám…' : '💾 Uložiť scenár'}
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt editor */}
              <div style={S.card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g6, #4B5563)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🤖 Systémový prompt
                </div>
                <div style={S.langTabs}>
                  {LANGUAGES.map(l => (
                    <button key={l.value} style={S.langTab(activeLang === l.value)} onClick={() => setActiveLang(l.value as Lang)}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <textarea
                  style={S.textarea}
                  value={text}
                  placeholder={`Systémový prompt pre scenár „${s.label}" · ${LANGUAGES.find(l => l.value === activeLang)?.label}…\n\nAk nie je prompt uložený, použije sa fallback prompt.`}
                  onChange={e => setEditTexts(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={14}
                />
                <p style={S.hint}>Kontext zákazky sa vkladá automaticky. Ak operátor zadá doplnkový pokyn v modali, pripojí sa na koniec ako „POKYN OPERÁTORA".</p>
                <div style={S.cardFooter}>
                  <button style={S.btnSave(saving)} disabled={saving} onClick={() => savePrompt(s.key, activeLang)}>
                    {saving ? '⏳ Ukladám…' : '💾 Uložiť prompt'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function NumericInput({
  value,
  onChange,
  min,
  max,
  style,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  style?: React.CSSProperties
  disabled?: boolean
}) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => { setLocal(String(value)) }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={local}
      disabled={disabled}
      style={{ ...style, ...(disabled ? { opacity: 0.45, cursor: 'not-allowed', background: '#F3F4F6' } : {}) }}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        setLocal(raw)
        if (raw !== '') onChange(Number(raw))
      }}
      onBlur={() => {
        if (local === '' || isNaN(Number(local))) setLocal(String(value))
      }}
    />
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
        background: value ? 'var(--gold, #BF953F)' : 'var(--g3, #D1D5DB)',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
        left: value ? 22 : 2,
      }} />
    </div>
  )
}

function TriggerTooltip({ lines }: { lines: string[] }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--g3, #D1D5DB)', border: 'none',
          cursor: 'pointer', fontSize: 11, fontWeight: 700,
          color: 'var(--g6, #4B5563)', lineHeight: '18px',
          padding: 0, flexShrink: 0, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Nápoveda"
      >?</button>
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1A1A2E', color: '#F0F0F0',
          borderRadius: 10, padding: '12px 14px',
          width: 300, zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          {lines.map((line, i) => (
            <p key={i} style={{
              margin: i === 0 ? 0 : '8px 0 0',
              fontSize: 12.5, lineHeight: 1.55,
              color: line.startsWith('✅') ? '#86EFAC'
                   : line.startsWith('⏱') ? '#FCD34D'
                   : line.startsWith('🔁') ? '#93C5FD'
                   : '#F0F0F0',
            }}>{line}</p>
          ))}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1A1A2E',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab({
  config,
  setConfig,
  saving,
  saveConfig,
}: {
  config: VoicebotConfig
  setConfig: React.Dispatch<React.SetStateAction<VoicebotConfig>>
  saving: boolean
  saveConfig: (patch: Partial<VoicebotConfig>) => Promise<void>
}) {
  function handleSave() { saveConfig(config) }

  const formGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--dark, #1A1A1A)' }
  const numInput: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid var(--g3, #D1D5DB)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--dark, #1A1A1A)',
    background: '#fff',
    fontFamily: "'Montserrat', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={S.infoBox}>Zmeny sa prejavia pri ďalšom hovore.</div>

      <div style={S.card}>
        <div style={{ ...S.sectionTitle, marginBottom: 20 }}>⏱️ Timeouty</div>

        <div style={formGroup}>
          <label style={label}>Ticho pred výzvou — no_speech_timeout</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NumericInput min={10} max={300} style={{ ...numInput, width: 90 }}
              value={config.no_speech_timeout}
              onChange={n => setConfig(prev => ({ ...prev, no_speech_timeout: n }))} />
            <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>sekúnd</span>
          </div>
          <p style={S.hint}>Koľko sekúnd ticha, kým sa AI opýta „Ste tu?" (predvolená: 45 s)</p>
        </div>

        <div style={formGroup}>
          <label style={label}>Max. neprerušená reč — long_speech_timeout</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NumericInput min={10} max={600} style={{ ...numInput, width: 90 }}
              value={config.long_speech_timeout}
              onChange={n => setConfig(prev => ({ ...prev, long_speech_timeout: n }))} />
            <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>sekúnd</span>
          </div>
          <p style={S.hint}>Ak hovorí volajúci dlhšie ako X sekúnd bez prestávky, AI ho slušne preruší (predvolená: 60 s)</p>
        </div>

        <div style={{ ...formGroup, marginBottom: 4 }}>
          <label style={label}>Maximálna dĺžka hovoru — call_timeout</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NumericInput min={60} max={3600} style={{ ...numInput, width: 90 }}
              value={config.call_timeout}
              onChange={n => setConfig(prev => ({ ...prev, call_timeout: n }))} />
            <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>sekúnd</span>
          </div>
          <p style={S.hint}>Po uplynutí tohto času AI hovor ukončí (predvolená: 420 s = 7 min)</p>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.sectionTitle, marginBottom: 20 }}>🔄 Presmerovanie na operátora</div>

        <div style={formGroup}>
          <label style={label}>Presmerovanie na živého operátora</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Toggle value={config.use_call_transfer} onChange={v => setConfig(prev => ({ ...prev, use_call_transfer: v }))} />
            <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>
              {config.use_call_transfer ? 'Zapnuté' : 'Vypnuté'}
            </span>
          </div>
          <p style={S.hint}>Ak zákazník požiada o živého operátora, hovor sa prenesie na zadané číslo.</p>
        </div>

        <div style={formGroup}>
          <label style={label}>Číslo pre presmerovanie — CZ</label>
          <input type="tel" value={config.transfer_number_cz}
            onChange={e => setConfig(prev => ({ ...prev, transfer_number_cz: e.target.value }))}
            placeholder="+420..." disabled={!config.use_call_transfer}
            style={{ ...numInput, width: 220, ...(config.use_call_transfer ? {} : { opacity: 0.45, cursor: 'not-allowed' }) }} />
        </div>

        <div style={{ ...formGroup, marginBottom: 4 }}>
          <label style={label}>Číslo pre presmerovanie — SK</label>
          <input type="tel" value={config.transfer_number_sk}
            onChange={e => setConfig(prev => ({ ...prev, transfer_number_sk: e.target.value }))}
            placeholder="+421..." disabled={!config.use_call_transfer}
            style={{ ...numInput, width: 220, ...(config.use_call_transfer ? {} : { opacity: 0.45, cursor: 'not-allowed' }) }} />
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.sectionTitle, marginBottom: 20 }}>🕐 Prevádzkové hodiny</div>

        {(['weekdays', 'weekends_holidays'] as const).map(period => (
          <div key={period} style={formGroup}>
            <label style={label}>
              {period === 'weekdays' ? 'Pracovné dni' : 'Víkendy a sviatky'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="time" value={config.opening_hours[period].start}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  opening_hours: { ...prev.opening_hours, [period]: { ...prev.opening_hours[period], start: e.target.value } },
                }))}
                style={{ ...numInput, width: 120 }} />
              <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>–</span>
              <input type="time" value={config.opening_hours[period].end}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  opening_hours: { ...prev.opening_hours, [period]: { ...prev.opening_hours[period], end: e.target.value } },
                }))}
                style={{ ...numInput, width: 120 }} />
            </div>
          </div>
        ))}
        <p style={S.hint}>Mimo prevádzkových hodín AI neodpovedá a hovor sa automaticky prepne na operátora (ak je presmerovanie zapnuté).</p>
      </div>

      <div style={S.card}>
        <div style={{ ...S.sectionTitle, marginBottom: 8 }}>📞 Hodiny odchádzajúcich hovorov</div>
        <p style={{ ...S.hint, marginBottom: 20 }}>Automatické triggery volajú iba v týchto hodinách. Manuálne hovory operátora tieto hodiny ignorujú.</p>

        {(['client', 'technician'] as const).map(who => (
          <div key={who} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #1A1A1A)', marginBottom: 10 }}>
              {who === 'client' ? '👤 Zákazník' : '🔧 Technik'}
            </div>
            {(['weekdays', 'weekends_holidays'] as const).map(period => (
              <div key={period} style={{ ...formGroup, marginBottom: 10 }}>
                <label style={{ ...label, fontWeight: 500, fontSize: 12 }}>
                  {period === 'weekdays' ? 'Pracovné dni' : 'Víkendy a sviatky'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="time" value={config.calling_hours[who][period].start}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      calling_hours: {
                        ...prev.calling_hours,
                        [who]: {
                          ...prev.calling_hours[who],
                          [period]: { ...prev.calling_hours[who][period], start: e.target.value },
                        },
                      },
                    }))}
                    style={{ ...numInput, width: 120 }} />
                  <span style={{ fontSize: 13, color: 'var(--g5, #6B7280)' }}>–</span>
                  <input type="time" value={config.calling_hours[who][period].end}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      calling_hours: {
                        ...prev.calling_hours,
                        [who]: {
                          ...prev.calling_hours[who],
                          [period]: { ...prev.calling_hours[who][period], end: e.target.value },
                        },
                      },
                    }))}
                    style={{ ...numInput, width: 120 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={S.btnSave(saving)} disabled={saving} onClick={handleSave}>
          {saving ? '⏳ Ukladám…' : '💾 Uložiť nastavenia'}
        </button>
      </div>
    </div>
  )
}
