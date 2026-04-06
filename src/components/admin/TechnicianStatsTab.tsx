'use client'

import { useState, useEffect, useCallback } from 'react'
import { SPECIALIZATIONS } from '@/lib/constants'

// ─── Regions (CZ + SK) ────────────────────────────────────────────────────────
const CZ_REGIONS: Record<string, string[]> = {
  'Praha': ['Praha', 'Prague'],
  'Středočeský': ['Benešov', 'Beroun', 'Kladno', 'Kolín', 'Kutná Hora', 'Mělník', 'Mladá Boleslav', 'Nymburk', 'Příbram', 'Rakovník'],
  'Jihočeský': ['České Budějovice', 'Český Krumlov', 'Jindřichův Hradec', 'Písek', 'Prachatice', 'Strakonice', 'Tábor'],
  'Plzeňský': ['Plzeň', 'Domažlice', 'Klatovy', 'Rokycany', 'Tachov'],
  'Karlovarský': ['Karlovy Vary', 'Cheb', 'Sokolov'],
  'Ústecký': ['Ústí nad Labem', 'Děčín', 'Chomutov', 'Litoměřice', 'Louny', 'Most', 'Teplice'],
  'Liberecký': ['Liberec', 'Česká Lípa', 'Jablonec nad Nisou', 'Semily'],
  'Královéhradecký': ['Hradec Králové', 'Jičín', 'Náchod', 'Rychnov nad Kněžnou', 'Trutnov'],
  'Pardubický': ['Pardubice', 'Chrudim', 'Svitavy', 'Ústí nad Orlicí'],
  'Vysočina': ['Jihlava', 'Havlíčkův Brod', 'Pelhřimov', 'Třebíč', 'Žďár nad Sázavou'],
  'Jihomoravský': ['Brno', 'Blansko', 'Břeclav', 'Hodonín', 'Vyškov', 'Znojmo'],
  'Olomoucký': ['Olomouc', 'Jeseník', 'Prostějov', 'Přerov', 'Šumperk'],
  'Zlínský': ['Zlín', 'Kroměříž', 'Uherské Hradiště', 'Vsetín'],
  'Moravskoslezský': ['Ostrava', 'Bruntál', 'Frýdek-Místek', 'Karviná', 'Nový Jičín', 'Opava'],
  // SK kraje
  'Bratislavský': ['Bratislava', 'Malacky', 'Pezinok', 'Senec'],
  'Trnavský': ['Trnava', 'Dunajská Streda', 'Galanta', 'Hlohovec', 'Piešťany', 'Senica', 'Skalica'],
  'Trenčiansky': ['Trenčín', 'Bánovce nad Bebravou', 'Ilava', 'Myjava', 'Nové Mesto nad Váhom', 'Partizánske', 'Považská Bystrica', 'Púchov'],
  'Nitriansky': ['Nitra', 'Komárno', 'Levice', 'Nové Zámky', 'Šaľa', 'Topoľčany', 'Zlaté Moravce'],
  'Žilinský': ['Žilina', 'Bytča', 'Čadca', 'Dolný Kubín', 'Kysucké Nové Mesto', 'Liptovský Mikuláš', 'Martin', 'Námestovo', 'Ružomberok', 'Turčianske Teplice', 'Tvrdošín'],
  'Banskobystrický': ['Banská Bystrica', 'Banská Štiavnica', 'Brezno', 'Detva', 'Krupina', 'Lučenec', 'Poltár', 'Revúca', 'Rimavská Sobota', 'Veľký Krtíš', 'Zvolen', 'Žarnovica', 'Žiar nad Hronom'],
  'Prešovský': ['Prešov', 'Bardejov', 'Humenné', 'Kežmarok', 'Levoča', 'Medzilaborce', 'Poprad', 'Sabinov', 'Snina', 'Stará Ľubovňa', 'Stropkov', 'Svidník', 'Vranov nad Topľou'],
  'Košický': ['Košice', 'Gelnica', 'Michalovce', 'Rožňava', 'Sobrance', 'Spišská Nová Ves', 'Trebišov'],
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CriticalAlert {
  id: number
  name: string
  city: string | null
  category: string | null
  rating: number | null
  aiScore: number
  riskLevel: string
  alertType: 'burnout' | 'attrition' | 'decline' | 'settlement_mismatch'
  signals: string[]
  weeklyHours?: number
  daysSinceLastResponse?: number
  ratingChange?: number
}

interface WarningAlert {
  id: number
  name: string
  city: string | null
  aiScore: number
}

interface RankingEntry {
  id: number
  name: string
  aiScore: number
  rating: number | null
  jobsCompleted: number
  earnings: number
  consistency: number
}

interface RisingEntry {
  id: number
  name: string
  aiScore: number
  aiScoreChange: number
  ratingChange?: string
}

interface FinancialEntry {
  id: number
  name: string
  jobsCompleted: number
  earnings: number
  avgPerJob: number
  consistency: number
}

interface StatsData {
  generatedAt: string
  windowDays: number
  alerts: {
    critical: CriticalAlert[]
    warning: WarningAlert[]
  }
  kpi: {
    activeTechnicians: number
    avgRating: number
    totalJobs: number
    completionRate: number
    totalRevenue: number
  }
  rankings: {
    top: RankingEntry[]
    rising: RisingEntry[]
    financial: FinancialEntry[]
  }
  charts: {
    activityByMonth: Array<{ month: string; count: number }>
    categoryDistribution: Array<{ category: string; count: number }>
  }
}

interface TechnicianStatsTabProps {
  onNavigateToTechnician: (id: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCur(amount: number | undefined | null, country?: string): string {
  const val = Number(amount ?? 0) || 0
  if (country === 'SK') return `${val.toLocaleString('sk-SK')} €`
  return `${val.toLocaleString('cs-CZ')} Kč`
}

function alertTypeLabel(type: CriticalAlert['alertType']): string {
  switch (type) {
    case 'burnout': return 'VYHORENIE'
    case 'attrition': return 'ODCHOD'
    case 'decline': return 'POKLES'
    case 'settlement_mismatch': return 'ZÚČTOVANIE'
  }
}

function alertTypeBg(type: CriticalAlert['alertType']): string {
  if (type === 'settlement_mismatch') return '#b45309'
  return '#dc2626'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TechnicianStatsTab({ onNavigateToTechnician }: TechnicianStatsTabProps) {
  const [windowDays, setWindowDays] = useState<30 | 90 | 365>(30)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [rankingMetric, setRankingMetric] = useState<'aiScore' | 'jobsCompleted' | 'rating' | 'earnings'>('aiScore')
  const [warningExpanded, setWarningExpanded] = useState(false)

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/technicians/stats?window=${windowDays}`)
      if (!res.ok) throw new Error('Nepodarilo sa načítať štatistiky')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Nastala chyba')
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setLoading(false)
    }
  }, [windowDays])

  useEffect(() => { loadStats() }, [loadStats])

  // ── Derived: filter critical alerts by category/region ──────────────────────
  const filteredCritical = (stats?.alerts.critical ?? []).filter(a => {
    if (categoryFilter && a.category !== categoryFilter) return false
    if (regionFilter && a.city) {
      const cities = CZ_REGIONS[regionFilter] ?? []
      const cityLower = a.city.toLowerCase()
      if (!cities.some(c => cityLower.includes(c.toLowerCase()) || c.toLowerCase().includes(cityLower))) return false
    }
    return true
  })

  const filteredWarning = (stats?.alerts.warning ?? []).filter(a => {
    if (regionFilter && a.city) {
      const cities = CZ_REGIONS[regionFilter] ?? []
      const cityLower = a.city.toLowerCase()
      if (!cities.some(c => cityLower.includes(c.toLowerCase()) || c.toLowerCase().includes(cityLower))) return false
    }
    return true
  })

  // ── Top ranking sorted by chosen metric ──────────────────────────────────────
  const sortedTop = [...(stats?.rankings.top ?? [])].sort((a, b) => {
    if (rankingMetric === 'aiScore') return b.aiScore - a.aiScore
    if (rankingMetric === 'jobsCompleted') return b.jobsCompleted - a.jobsCompleted
    if (rankingMetric === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (rankingMetric === 'earnings') return b.earnings - a.earnings
    return 0
  }).slice(0, 10)

  // ── Chart max values ──────────────────────────────────────────────────────────
  const maxActivity = Math.max(...(stats?.charts.activityByMonth.map(m => m.count) ?? [1]), 1)
  const totalCategoryJobs = (stats?.charts.categoryDistribution ?? []).reduce((s, c) => s + c.count, 0) || 1

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid var(--g2)', borderTopColor: 'var(--gold)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'var(--g4)', fontSize: 14 }}>Načítavam štatistiky…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        margin: '24px', padding: '16px 20px',
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
        color: '#991b1b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>⚠️</span>
        <span>{error}</span>
        <button
          onClick={loadStats}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 6,
            border: '1px solid #fca5a5', background: 'white',
            color: '#dc2626', fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Skúsiť znova
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 0 40px' }}>

      {/* ── 1. FILTER BAR ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        background: 'white',
        border: '1px solid var(--g2)',
        borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([30, 90, 365] as const).map(days => (
            <button
              key={days}
              onClick={() => setWindowDays(days)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: windowDays === days ? 'var(--gold)' : 'var(--g3)',
                background: windowDays === days ? 'linear-gradient(135deg, #d4a843, #b8860b)' : 'white',
                color: windowDays === days ? 'white' : 'var(--dark)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {days === 30 ? '30 dní' : days === 90 ? '90 dní' : 'Tento rok'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--g2)', margin: '0 4px' }} />

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 6,
            border: '1px solid var(--g3)', background: 'white',
            color: categoryFilter ? 'var(--dark)' : 'var(--g5)',
            fontSize: 13, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
          }}
        >
          <option value="">Všetky kategórie</option>
          {SPECIALIZATIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Region filter */}
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 6,
            border: '1px solid var(--g3)', background: 'white',
            color: regionFilter ? 'var(--dark)' : 'var(--g5)',
            fontSize: 13, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
          }}
        >
          <option value="">Všetky regióny</option>
          {Object.keys(CZ_REGIONS).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {(categoryFilter || regionFilter) && (
          <button
            onClick={() => { setCategoryFilter(''); setRegionFilter('') }}
            style={{
              padding: '6px 10px', borderRadius: 6,
              border: '1px solid var(--g3)', background: 'white',
              color: 'var(--g4)', fontSize: 12, cursor: 'pointer',
            }}
          >
            ✕ Zrušiť filtre
          </button>
        )}

        {stats && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--g4)' }}>
            Aktualizované: {new Date(stats.generatedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── 2. CRITICAL ALERTS ───────────────────────────────────────────────── */}
      {filteredCritical.length > 0 && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#991b1b', fontFamily: 'Montserrat, sans-serif' }}>
              Kritické — vyžaduje okamžitú pozornosť ({filteredCritical.length})
            </span>
          </div>

          {/* Horizontally scrollable cards */}
          <div style={{
            display: 'flex', gap: 14, padding: '16px 20px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}>
            {filteredCritical.map(alert => (
              <div
                key={alert.id}
                style={{
                  flexShrink: 0,
                  width: 280,
                  scrollSnapAlign: 'start',
                  background: 'white',
                  border: '1px solid #fca5a5',
                  borderRadius: 10,
                  padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Header: name + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif', lineHeight: 1.3 }}>
                    {alert.name}
                  </span>
                  <span style={{
                    flexShrink: 0,
                    background: alertTypeBg(alert.alertType),
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                    fontFamily: 'Montserrat, sans-serif',
                  }}>
                    {alertTypeLabel(alert.alertType)}
                  </span>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
                  {alert.city && (
                    <span style={{ color: '#374151', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' }}>
                      📍 {alert.city}
                    </span>
                  )}
                  {alert.category && (
                    <span style={{ color: '#374151', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' }}>
                      {alert.category}
                    </span>
                  )}
                  {alert.rating != null && (
                    <span style={{ color: '#374151', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' }}>
                      {Number(alert.rating).toFixed(1)}★
                    </span>
                  )}
                  <span style={{ color: '#374151', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' }}>
                    {alert.aiScore}/100 AI
                  </span>
                </div>

                {/* Signals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {alert.signals.map((signal, i) => (
                    <div key={i} style={{
                      fontSize: 12,
                      color: '#7f1d1d',
                      background: '#fff1f2',
                      borderRadius: 5,
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 5,
                      lineHeight: 1.4,
                    }}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>•</span>
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <a
                    href={`/admin/technicians/${alert.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #d4a843, #b8860b)',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    👤 Profil
                  </a>
                  <button
                    onClick={() => onNavigateToTechnician(alert.id)}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--g3)',
                      background: 'white',
                      color: 'var(--dark)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    📋 Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. WARNING ALERTS ────────────────────────────────────────────────── */}
      {filteredWarning.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setWarningExpanded(v => !v)}
            style={{
              width: '100%',
              padding: '14px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#92400e', fontFamily: 'Montserrat, sans-serif', flex: 1 }}>
              Sledovať — mierne riziko ({filteredWarning.length} technikov)
            </span>
            <span style={{ fontSize: 16, color: '#92400e', transition: 'transform 0.2s', display: 'inline-block', transform: warningExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▾
            </span>
          </button>

          {warningExpanded && (
            <div style={{
              padding: '4px 20px 16px',
              borderTop: '1px solid #fde68a',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              {filteredWarning.map(w => (
                <button
                  key={w.id}
                  onClick={() => onNavigateToTechnician(w.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #fcd34d',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>{w.name}</span>
                  {w.city && (
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{w.city}</span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: '#fef3c7', color: '#92400e',
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {w.aiScore} AI
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. KPI CARDS ─────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
        }}>
          {[
            {
              label: 'Aktívni technici',
              value: String(stats.kpi.activeTechnicians ?? 0),
              color: 'var(--gold)',
              icon: '👷',
            },
            {
              label: 'Ø Hodnotenie',
              value: `${(Number(stats.kpi.avgRating) || 0).toFixed(1)}★`,
              color: '#f59e0b',
              icon: '⭐',
            },
            {
              label: 'Zákazky',
              value: (Number(stats.kpi.totalJobs) || 0).toLocaleString('cs-CZ'),
              color: '#2563eb',
              icon: '📋',
            },
            {
              label: 'Úspešnosť dokončenia',
              value: `${Math.round(Number(stats.kpi.completionRate) || 0)}%`,
              color: '#16a34a',
              icon: '✅',
            },
            {
              label: 'Obrat',
              value: fmtCur(stats.kpi.totalRevenue),
              color: '#7c3aed',
              icon: '💰',
            },
          ].map(kpi => (
            <div
              key={kpi.label}
              style={{
                background: 'white',
                border: '1px solid var(--g2)',
                borderRadius: 10,
                padding: '16px 18px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 18 }}>{kpi.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, fontFamily: 'Montserrat, sans-serif', lineHeight: 1.1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. RANKINGS ──────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {/* TOP 10 */}
          <div style={{
            background: 'white',
            border: '1px solid var(--g2)',
            borderRadius: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--g2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
                🏆 TOP 10 — Výkon
              </span>
              <select
                value={rankingMetric}
                onChange={e => setRankingMetric(e.target.value as typeof rankingMetric)}
                style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--g3)', background: 'white',
                  color: 'var(--dark)', fontSize: 12,
                  fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
                }}
              >
                <option value="aiScore">AI skóre</option>
                <option value="jobsCompleted">Zákazky</option>
                <option value="rating">Rating</option>
                <option value="earnings">Zárobky</option>
              </select>
            </div>

            <div style={{ padding: '8px 0' }}>
              {sortedTop.map((tech, i) => (
                <button
                  key={tech.id}
                  onClick={() => onNavigateToTechnician(tech.id)}
                  style={{
                    width: '100%',
                    padding: '10px 18px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--g1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i < 3 ? 'linear-gradient(135deg, #d4a843, #b8860b)' : 'var(--g2)',
                    color: i < 3 ? 'white' : 'var(--g6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    fontFamily: 'Montserrat, sans-serif',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
                    {tech.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{tech.aiScore} AI</span>
                    {tech.rating != null && (
                      <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{Number(tech.rating).toFixed(1)}★</span>
                    )}
                    <span style={{ fontSize: 12, color: '#4b5563' }}>{tech.jobsCompleted} zák.</span>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--g2)' }}>
              <button
                onClick={() => onNavigateToTechnician(0)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gold)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Zobraziť celý rebríček →
              </button>
            </div>
          </div>

          {/* Rising */}
          <div style={{
            background: 'white',
            border: '1px solid var(--g2)',
            borderRadius: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--g2)' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
                📈 Najlepšie sa zlepšujú
              </span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {stats.rankings.rising.length === 0 ? (
                <p style={{ padding: '16px 18px', color: 'var(--g4)', fontSize: 13 }}>Žiadne dáta</p>
              ) : stats.rankings.rising.map((tech, i) => (
                <button
                  key={tech.id}
                  onClick={() => onNavigateToTechnician(tech.id)}
                  style={{
                    width: '100%',
                    padding: '10px 18px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--g1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#065f46',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    fontFamily: 'Montserrat, sans-serif',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
                    {tech.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{tech.aiScore} AI</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: '#16a34a',
                      background: '#dcfce7',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      +{tech.aiScoreChange}
                    </span>
                    {tech.ratingChange && (
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                        {tech.ratingChange}★
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--g2)' }}>
              <button
                onClick={() => onNavigateToTechnician(0)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gold)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Zobraziť celý rebríček →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. CHARTS ────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {/* Activity bar chart */}
          <div style={{
            background: 'white',
            border: '1px solid var(--g2)',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <h4 style={{
              margin: '0 0 16px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 14, fontWeight: 700,
              color: 'var(--dark)',
            }}>
              📅 Aktivita (posledné mesiace)
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: 120,
            }}>
              {stats.charts.activityByMonth.map(m => {
                const pct = m.count / maxActivity
                return (
                  <div
                    key={m.month}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>{m.count}</span>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(pct * 90, 4)}px`,
                        background: 'linear-gradient(180deg, #d4a843, #b8860b)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', lineHeight: 1.2 }}>
                      {m.month}
                    </span>
                  </div>
                )
              })}
              {stats.charts.activityByMonth.length === 0 && (
                <p style={{ color: 'var(--g4)', fontSize: 13, alignSelf: 'center', margin: '0 auto' }}>Žiadne dáta</p>
              )}
            </div>
          </div>

          {/* Category distribution */}
          <div style={{
            background: 'white',
            border: '1px solid var(--g2)',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <h4 style={{
              margin: '0 0 16px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 14, fontWeight: 700,
              color: 'var(--dark)',
            }}>
              🔧 Rozloženie podľa kategórie
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.charts.categoryDistribution.slice(0, 8).map(c => {
                const pct = Math.round((c.count / totalCategoryJobs) * 100)
                return (
                  <div key={c.category}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 4,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
                        {c.category}
                      </span>
                      <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>
                        {c.count} ({pct}%)
                      </span>
                    </div>
                    <div style={{
                      height: 8, borderRadius: 4,
                      background: 'var(--g2)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #d4a843, #b8860b)',
                        borderRadius: 4,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
              {stats.charts.categoryDistribution.length === 0 && (
                <p style={{ color: 'var(--g4)', fontSize: 13 }}>Žiadne dáta</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. FINANCIAL TABLE ───────────────────────────────────────────────── */}
      {stats && stats.rankings.financial.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid var(--g2)',
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--g2)' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', fontFamily: 'Montserrat, sans-serif' }}>
              💰 Finančná efektivita — TOP 5 zarábajúcich technikov
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat, sans-serif' }}>
              <thead>
                <tr style={{ background: 'var(--g1)' }}>
                  {['#', 'Technik', 'Zákazky', 'Obrat', 'Ø / zákazka', 'Konzistencia'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 16px',
                        textAlign: col === '#' ? 'center' : 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#4b5563',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--g2)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.rankings.financial.slice(0, 5).map((tech, i) => (
                  <tr
                    key={tech.id}
                    style={{ borderBottom: '1px solid var(--g2)', cursor: 'pointer' }}
                    onClick={() => onNavigateToTechnician(tech.id)}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--g1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: '50%',
                        background: i < 3 ? 'linear-gradient(135deg, #d4a843, #b8860b)' : 'var(--g2)',
                        color: i < 3 ? 'white' : 'var(--g6)',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                      {tech.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                      {tech.jobsCompleted}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                      {fmtCur(tech.earnings)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                      {fmtCur(tech.avgPerJob)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, height: 6, borderRadius: 3,
                          background: 'var(--g2)', overflow: 'hidden', minWidth: 60,
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.round(tech.consistency * 100)}%`,
                            background: tech.consistency >= 0.8 ? '#16a34a' : tech.consistency >= 0.5 ? '#f59e0b' : '#dc2626',
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: tech.consistency >= 0.8 ? '#16a34a' : tech.consistency >= 0.5 ? '#92400e' : '#dc2626',
                          minWidth: 32,
                        }}>
                          {Math.round(tech.consistency * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats && stats.kpi.activeTechnicians === 0 && (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--g4)',
          fontSize: 14,
          fontFamily: 'Montserrat, sans-serif',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👷</div>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Žiadni aktívni technici</div>
          <div>Pre zvolené obdobie neboli nájdené žiadne dáta.</div>
        </div>
      )}

    </div>
  )
}
