'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import type { PartnerPricingConfig, KmZoneEntry, HourlyRateEntry, EmergencyFeeConfig, MarginConfigEntry } from '@/lib/pricing-tables'

const SERVICE_TYPES = ['Štandard', 'Špeciál', 'Diagnostika', 'Kanalizácia'] as const
type ServiceType = typeof SERVICE_TYPES[number]

interface Props {
  partnerId: number
  partnerCode: string
}

export default function PartnerPricingConfigPanel({ partnerId }: Props) {
  const [config, setConfig] = useState<PartnerPricingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [hourlyRates, setHourlyRates] = useState<Record<ServiceType, HourlyRateEntry>>({} as Record<ServiceType, HourlyRateEntry>)
  const [czkHourlyRates, setCzkHourlyRates] = useState<Record<ServiceType, HourlyRateEntry> | undefined>(undefined)
  const [hasCzkRates, setHasCzkRates] = useState(false)
  const [kmZones, setKmZones] = useState<KmZoneEntry[]>([])
  const [czkKmZones, setCzkKmZones] = useState<KmZoneEntry[]>([])
  const [hasCzkKmZones, setHasCzkKmZones] = useState(false)
  const [emergencyFees, setEmergencyFees] = useState<EmergencyFeeConfig>({} as EmergencyFeeConfig)
  const [vatMode, setVatMode] = useState<'as_customer' | 'as_b2b'>('as_b2b')
  const [exchangeRateCzk, setExchangeRateCzk] = useState(25.28)
  const [marginConfig, setMarginConfig] = useState<MarginConfigEntry>({} as MarginConfigEntry)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ config: PartnerPricingConfig }>(
        `/api/partners/${partnerId}/pricing-config`
      )
      setConfig(data.config)
      resetFormFromConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní')
    } finally {
      setIsLoading(false)
    }
  }, [partnerId])

  useEffect(() => { loadConfig() }, [loadConfig])

  function resetFormFromConfig(cfg: PartnerPricingConfig) {
    setHourlyRates(cfg.hourlyRates as Record<ServiceType, HourlyRateEntry>)
    setHasCzkRates(!!cfg.czkHourlyRates)
    setCzkHourlyRates(cfg.czkHourlyRates as Record<ServiceType, HourlyRateEntry> | undefined)
    setKmZones(cfg.kmZones)
    setHasCzkKmZones(!!cfg.czkKmZones)
    setCzkKmZones(cfg.czkKmZones ?? [])
    setEmergencyFees(cfg.emergencyFees)
    setVatMode(cfg.vatMode)
    setExchangeRateCzk(cfg.exchangeRateCzk)
    setMarginConfig(cfg.marginConfig)
  }

  function cancelEdit() {
    if (config) resetFormFromConfig(config)
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: Partial<PartnerPricingConfig> = {
        hourlyRates,
        kmZones,
        emergencyFees,
        vatMode,
        exchangeRateCzk,
        marginConfig,
      }
      if (hasCzkRates && czkHourlyRates) payload.czkHourlyRates = czkHourlyRates
      if (hasCzkKmZones && czkKmZones.length > 0) payload.czkKmZones = czkKmZones
      await apiFetch(`/api/partners/${partnerId}/pricing-config`, { method: 'PUT', body: payload })
      setSuccess('Cenník bol uložený')
      setIsEditing(false)
      setConfig({ ...config!, ...payload })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní')
    } finally {
      setIsSaving(false)
    }
  }

  function updateHourlyRate(table: 'eur' | 'czk', type: ServiceType, field: 'hour1' | 'hour2', value: number) {
    if (table === 'eur') {
      setHourlyRates(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
    } else {
      setCzkHourlyRates(prev => ({
        ...(prev ?? {} as Record<ServiceType, HourlyRateEntry>),
        [type]: { ...(prev?.[type] ?? { hour1: 0, hour2: 0 }), [field]: value },
      }))
    }
  }

  function updateKmZone(zones: KmZoneEntry[], setZones: (z: KmZoneEntry[]) => void, idx: number, field: keyof KmZoneEntry, value: number) {
    const updated = [...zones]
    updated[idx] = { ...updated[idx], [field]: value }
    setZones(updated)
  }

  if (isLoading) {
    return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--g5)', fontSize: 14 }}>Načítavam cenník...</div>
  }

  const sectionStyle: React.CSSProperties = { marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--g2)' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'block' }
  const inputStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 13, border: '1px solid var(--g3)', borderRadius: 6, background: 'var(--g1)', color: 'var(--dark)', fontFamily: 'inherit' }
  const thStyle: React.CSSProperties = { padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--g5)', borderBottom: '1px solid var(--g2)' }
  const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--g1)' }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        {!isEditing ? (
          <button className="admin-btn admin-btn-dark admin-btn-sm" onClick={() => setIsEditing(true)}>
            ✏️ Upraviť cenník
          </button>
        ) : (
          <>
            <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={cancelEdit}>Zrušiť</button>
            <button className="admin-btn admin-btn-gold admin-btn-sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Ukladám...' : 'Uložiť'}
            </button>
          </>
        )}
      </div>

      {error && <div style={{ background: '#FEE2E2', border: '1px solid var(--danger)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
      {success && <div style={{ background: '#D1FAE5', border: '1px solid var(--success)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#047857' }}>{success}</div>}

      {/* ── Hodinové sadzby EUR ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Hodinové sadzby — EUR (poisťovňa SK)</span>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Typ služby</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>1. hodina (€)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Ďalšie hodiny (€)</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_TYPES.map(type => (
              <tr key={type}>
                <td style={tdStyle}>{type}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {isEditing
                    ? <input type="number" value={hourlyRates[type]?.hour1 ?? 0} onChange={e => updateHourlyRate('eur', type, 'hour1', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'right', width: 80 }} min={0} />
                    : <strong>{hourlyRates[type]?.hour1 ?? '—'} €</strong>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {isEditing
                    ? <input type="number" value={hourlyRates[type]?.hour2 ?? 0} onChange={e => updateHourlyRate('eur', type, 'hour2', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'right', width: 80 }} min={0} />
                    : <strong>{hourlyRates[type]?.hour2 ?? '—'} €</strong>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Hodinové sadzby CZK ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Hodinové sadzby — CZK (poisťovňa CZ)</span>
          {isEditing && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--g5)', cursor: 'pointer', fontWeight: 'normal' }}>
              <input type="checkbox" checked={hasCzkRates} onChange={e => {
                setHasCzkRates(e.target.checked)
                if (e.target.checked && !czkHourlyRates) {
                  setCzkHourlyRates({ Štandard:{hour1:2280,hour2:1370}, Špeciál:{hour1:2960,hour2:1370}, Diagnostika:{hour1:1370,hour2:1370}, Kanalizácia:{hour1:5000,hour2:2500} })
                }
              }} />
              Má CZK sadzby
            </label>
          )}
        </div>
        {(hasCzkRates && czkHourlyRates) ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Typ služby</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>1. hodina (Kč)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Ďalšie hodiny (Kč)</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_TYPES.map(type => (
                <tr key={type}>
                  <td style={tdStyle}>{type}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isEditing
                      ? <input type="number" value={czkHourlyRates[type]?.hour1 ?? 0} onChange={e => updateHourlyRate('czk', type, 'hour1', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'right', width: 90 }} min={0} />
                      : <strong>{czkHourlyRates[type]?.hour1 ?? '—'} Kč</strong>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isEditing
                      ? <input type="number" value={czkHourlyRates[type]?.hour2 ?? 0} onChange={e => updateHourlyRate('czk', type, 'hour2', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, textAlign: 'right', width: 90 }} min={0} />
                      : <strong>{czkHourlyRates[type]?.hour2 ?? '—'} Kč</strong>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--g4)', fontStyle: 'italic' }}>Neaktívne</p>
        )}
      </div>

      {/* ── Cestovné EUR ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Cestovné — EUR zóny (poisťovňa SK)</span>
        <KmZonesEditor zones={kmZones} currency="€" isEditing={isEditing}
          onUpdate={(i, f, v) => updateKmZone(kmZones, setKmZones, i, f, v)}
          onAdd={() => setKmZones(z => [...z, { minKm: 0, kmPrice: 0, kmFix: 0 }])}
          onRemove={i => setKmZones(z => z.filter((_, idx) => idx !== i))} />
      </div>

      {/* ── Cestovné CZK ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Cestovné — CZK zóny (poisťovňa CZ)</span>
          {isEditing && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--g5)', cursor: 'pointer', fontWeight: 'normal' }}>
              <input type="checkbox" checked={hasCzkKmZones} onChange={e => {
                setHasCzkKmZones(e.target.checked)
                if (e.target.checked && czkKmZones.length === 0) {
                  setCzkKmZones([{ minKm:0, kmPrice:0, kmFix:830 }, { minKm:34, kmPrice:25, kmFix:5 }])
                }
              }} />
              Má CZK zóny
            </label>
          )}
        </div>
        {hasCzkKmZones
          ? <KmZonesEditor zones={czkKmZones} currency="Kč" isEditing={isEditing}
              onUpdate={(i, f, v) => updateKmZone(czkKmZones, setCzkKmZones, i, f, v)}
              onAdd={() => setCzkKmZones(z => [...z, { minKm: 0, kmPrice: 0, kmFix: 0 }])}
              onRemove={i => setCzkKmZones(z => z.filter((_, idx) => idx !== i))} />
          : <p style={{ fontSize: 13, color: 'var(--g4)', fontStyle: 'italic' }}>Neaktívne</p>}
      </div>

      {/* ── Pohotovostné príplatky ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Pohotovostné príplatky</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <EmgField label="Víkend/sviatok deň (7–17h) €" value={emergencyFees.weekendDay ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, weekendDay: v }))} />
          <EmgField label="Víkend/sviatok noc (17–7h) €" value={emergencyFees.weekendNight ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, weekendNight: v }))} />
          <EmgField label="Všedný deň večer (17–20h) €" value={emergencyFees.weekdayEvening ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, weekdayEvening: v }))} />
          <EmgField label="Všedný deň noc (20–7h) €" value={emergencyFees.weekdayNight ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, weekdayNight: v }))} />
          <EmgField label="Mimo prac. doby CZK (Kč)" value={emergencyFees.outsideWorkingHoursCzk ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, outsideWorkingHoursCzk: v }))} />
          <EmgField label="Do 24h CZK (Kč)" value={emergencyFees.within24hCzk ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, within24hCzk: v }))} />
          <EmgField label="Mimo prac. doby EUR (SK) €" value={emergencyFees.outsideWorkingHoursEur ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, outsideWorkingHoursEur: v }))} />
          <EmgField label="Do 24h EUR (SK) €" value={emergencyFees.within24hEur ?? 0} isEditing={isEditing} onChange={v => setEmergencyFees(p => ({ ...p, within24hEur: v }))} />
        </div>
      </div>

      {/* ── DPH & Marže ── */}
      <div>
        <span style={labelStyle}>DPH & Marže</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ConfigField label="Kurz EUR→CZK" isEditing={isEditing}
            display={`1 € = ${exchangeRateCzk} Kč`}
            input={<input type="number" value={exchangeRateCzk} onChange={e => setExchangeRateCzk(parseFloat(e.target.value) || 25.28)} style={inputStyle} step={0.01} min={1} />} />
          <div>
            <div style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4 }}>DPH režim</div>
            {isEditing
              ? <select value={vatMode} onChange={e => setVatMode(e.target.value as 'as_customer' | 'as_b2b')} style={inputStyle}>
                  <option value="as_b2b">B2B (AXA, SECURITY, ALLIANZ)</option>
                  <option value="as_customer">Ako zákazník (EUROP)</option>
                </select>
              : <strong style={{ fontSize: 14 }}>{vatMode === 'as_b2b' ? 'B2B' : 'Ako zákazník'}</strong>}
          </div>
          <ConfigField label="Min. marža CZK — práca (Kč)" isEditing={isEditing}
            display={`${marginConfig.czkTarget ?? '—'} Kč`}
            input={<input type="number" value={marginConfig.czkTarget ?? 975} onChange={e => setMarginConfig(p => ({ ...p, czkTarget: parseInt(e.target.value) || 0 }))} style={inputStyle} min={0} />} />
          <ConfigField label="Min. marža CZK — diagnostika (Kč)" isEditing={isEditing}
            display={`${marginConfig.czkDiagnosticsTarget ?? '—'} Kč`}
            input={<input type="number" value={marginConfig.czkDiagnosticsTarget ?? 500} onChange={e => setMarginConfig(p => ({ ...p, czkDiagnosticsTarget: parseInt(e.target.value) || 0 }))} style={inputStyle} min={0} />} />
          <ConfigField label="Max. marža EUR €" isEditing={isEditing}
            display={`${marginConfig.eurThreshold ?? '—'} €`}
            input={<input type="number" value={marginConfig.eurThreshold ?? 200} onChange={e => setMarginConfig(p => ({ ...p, eurThreshold: parseFloat(e.target.value) || 0 }))} style={inputStyle} min={0} />} />
          <ConfigField label="Per-callout strop EUR €" isEditing={isEditing}
            display={marginConfig.perCalloutCapEur != null ? `${marginConfig.perCalloutCapEur} €` : 'bez stropu'}
            input={<input type="number" value={marginConfig.perCalloutCapEur ?? ''} onChange={e => setMarginConfig(p => ({ ...p, perCalloutCapEur: e.target.value ? parseFloat(e.target.value) : null }))} style={inputStyle} min={0} placeholder="bez stropu" />} />
          <ConfigField label="Prah doplatku EUR (rabat) €" isEditing={isEditing}
            display={`${marginConfig.surchargeThresholdEur ?? '—'} €`}
            input={<input type="number" value={marginConfig.surchargeThresholdEur ?? 5} onChange={e => setMarginConfig(p => ({ ...p, surchargeThresholdEur: parseFloat(e.target.value) || 0 }))} style={inputStyle} step={0.5} min={0} />} />
          <ConfigField label="Prah doplatku CZK (rabat) Kč" isEditing={isEditing}
            display={`${marginConfig.surchargeThresholdCzk ?? '—'} Kč`}
            input={<input type="number" value={marginConfig.surchargeThresholdCzk ?? 150} onChange={e => setMarginConfig(p => ({ ...p, surchargeThresholdCzk: parseInt(e.target.value) || 0 }))} style={inputStyle} min={0} />} />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KmZonesEditor({ zones, currency, isEditing, onUpdate, onAdd, onRemove }: {
  zones: KmZoneEntry[]
  currency: string
  isEditing: boolean
  onUpdate: (idx: number, field: keyof KmZoneEntry, val: number) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}) {
  const th: React.CSSProperties = { padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--g5)', borderBottom: '1px solid var(--g2)' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--g1)' }
  const inp: React.CSSProperties = { width: 75, padding: '4px 8px', fontSize: 13, border: '1px solid var(--g3)', borderRadius: 6, background: 'var(--g1)', color: 'var(--dark)', textAlign: 'right' }
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={th}>Od km</th>
            <th style={{ ...th, textAlign: 'right' }}>Fix ({currency})</th>
            <th style={{ ...th, textAlign: 'right' }}>Per km ({currency}/km)</th>
            {isEditing && <th style={th} />}
          </tr>
        </thead>
        <tbody>
          {zones.map((zone, idx) => (
            <tr key={idx}>
              <td style={td}>
                {isEditing ? <input type="number" value={zone.minKm} onChange={e => onUpdate(idx, 'minKm', parseFloat(e.target.value) || 0)} style={inp} min={0} /> : <span>{zone.minKm} km</span>}
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                {isEditing ? <input type="number" value={zone.kmFix} onChange={e => onUpdate(idx, 'kmFix', parseFloat(e.target.value) || 0)} style={inp} min={0} /> : <strong>{zone.kmFix} {currency}</strong>}
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                {isEditing ? <input type="number" value={zone.kmPrice} onChange={e => onUpdate(idx, 'kmPrice', parseFloat(e.target.value) || 0)} style={inp} min={0} step={0.1} /> : <strong>{zone.kmPrice} {currency}</strong>}
              </td>
              {isEditing && (
                <td style={td}>
                  <button type="button" onClick={() => onRemove(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '0 4px' }}>×</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {isEditing && (
        <button type="button" onClick={onAdd} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', border: '1px dashed var(--g3)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--g5)' }}>
          + Pridať zónu
        </button>
      )}
    </div>
  )
}

function EmgField({ label, value, isEditing, onChange }: { label: string; value: number; isEditing: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4 }}>{label}</div>
      {isEditing
        ? <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid var(--g3)', borderRadius: 6, background: 'var(--g1)', color: 'var(--dark)' }} min={0} />
        : <strong style={{ fontSize: 14, color: value === 0 ? 'var(--g4)' : 'var(--dark)' }}>{value === 0 ? '—' : value}</strong>}
    </div>
  )
}

function ConfigField({ label, display, input, isEditing }: { label: string; display: string; input: React.ReactNode; isEditing: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4 }}>{label}</div>
      {isEditing ? input : <strong style={{ fontSize: 14 }}>{display}</strong>}
    </div>
  )
}
