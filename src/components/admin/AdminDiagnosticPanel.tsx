'use client'

/**
 * AdminDiagnosticPanel
 *
 * Zobrazí a umožní operátorovi vyplniť/upraviť všetky polia diagnostického formulára.
 * Použitie: keď klient volá operátorovi namiesto vyplnenia online formulára.
 *
 * Read mode:  Zobrazí všetky neprázdne polia organizované podľa fault_type.
 * Edit mode:  Kompaktný formulár — všetky polia pre vybraný fault_type naraz.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@/components/admin/Toast'
import type { DiagData } from '@/types/diagnostic'

export type { DiagData }

type FaultType =
  | 'vodoinstalater' | 'elektrikar' | 'kotel' | 'spotrebic'
  | 'deratizace' | 'zamecnik' | 'plynar' | 'odpady'
  | 'klimatizace' | 'tepelne_cerpadlo' | 'solarni_panely' | 'ine' | ''

interface AdminDiagnosticPanelProps {
  jobId: number
  initial?: DiagData
  onSaved?: (updated: DiagData) => void
  /** Controlled editing state — if provided, the panel does not manage it internally */
  editingControlled?: boolean
  onEditingChange?: (v: boolean) => void
}

// ── Label maps ─────────────────────────────────────────────────────

const FAULT_LABELS: Record<string, string> = {
  vodoinstalater: '🔧 Vodoinstalace',
  elektrikar: '⚡ Elektroinstalace',
  kotel: '🔥 Kotel a topení',
  plynar: '💨 Plynové zařízení',
  zamecnik: '🔑 Klíčová služba',
  odpady: '🚿 Ucpané odpady',
  spotrebic: '🧊 Elektrospotřebič',
  klimatizace: '❄️ Klimatizace',
  tepelne_cerpadlo: '🌡️ Tepelné čerpadlo',
  solarni_panely: '☀️ Solární panely',
  deratizace: '🐀 Deratizace',
  ine: '🔩 Ostatní práce',
}

const URGENCY_LABELS: Record<string, string> = {
  kritická: '🔴 Kritická',
  vysoká: '🟠 Vysoká',
  střední: '🟡 Střední',
  nízká: '🟢 Nízká',
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  soukroma_osoba: '👤 Súkromná osoba',
  firma: '🏢 Firma',
  svj: '🏘️ SVB / SVJ',
}

const PROPERTY_LABELS: Record<string, string> = {
  byt: '🏢 Byt',
  dum: '🏠 Rodinný dům',
  komercni: '🏗️ Komerční objekt',
  spolecne_prostory: '🏛️ Spoločné priestory',
}

// ── Helper: render array value as tags ─────────────────────────────

function Tags({ values }: { values: unknown }) {
  const arr = Array.isArray(values) ? (values as string[]) : []
  if (!arr.length) return <span style={{ color: 'var(--crm-text-3)' }}>—</span>
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {arr.map((v, i) => (
        <span key={i} style={{
          background: 'var(--crm-bg-2)', border: '1px solid var(--crm-border)',
          borderRadius: 4, padding: '1px 6px', fontSize: 12,
        }}>{v}</span>
      ))}
    </span>
  )
}

// ── Helper: read-only field row ─────────────────────────────────────

function ReadRow({ label, value, full }: { label: string; value?: string | number | unknown; full?: boolean }) {
  if (!value && value !== 0) return null
  const display = typeof value === 'string' || typeof value === 'number' ? String(value) : null
  return (
    <div className={`crm-field${full ? ' full-width' : ''}`}>
      <span className="crm-field-label">{label}</span>
      <div className="crm-field-value readonly">
        {display ?? <Tags values={value} />}
      </div>
    </div>
  )
}

// ── Helper: edit field ──────────────────────────────────────────────

function EditText({ label, field, value, onChange, textarea, placeholder, full }: {
  label: string; field: string; value: string; onChange: (f: string, v: string) => void
  textarea?: boolean; placeholder?: string; full?: boolean
}) {
  return (
    <div className={`crm-field${full ? ' full-width' : ''}`}>
      <span className="crm-field-label">{label}</span>
      {textarea
        ? <textarea className="crm-field-input" rows={3} value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} style={{ resize: 'vertical' }} />
        : <input className="crm-field-input" type="text" value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}

function EditSelect({ label, field, value, onChange, options, full }: {
  label: string; field: string; value: string; onChange: (f: string, v: string) => void
  options: { value: string; label: string }[]; full?: boolean
}) {
  return (
    <div className={`crm-field${full ? ' full-width' : ''}`}>
      <span className="crm-field-label">{label}</span>
      <select className="crm-field-input" value={value} onChange={e => onChange(field, e.target.value)}>
        <option value="">— Vyberte —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function EditCheckboxes({ label, field, value, onChange, options, full }: {
  label: string; field: string; value: string[]; onChange: (f: string, v: string[]) => void
  options: { value: string; label: string }[]; full?: boolean
}) {
  const toggle = (v: string) => {
    onChange(field, value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }
  return (
    <div className={`crm-field${full ? ' full-width' : ''}`}>
      <span className="crm-field-label">{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {options.map(o => (
          <label key={o.value} style={{
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            background: value.includes(o.value) ? 'var(--crm-gold-light, #fff8e1)' : 'var(--crm-bg-2)',
            border: `1px solid ${value.includes(o.value) ? 'var(--crm-gold, #f5a623)' : 'var(--crm-border)'}`,
            borderRadius: 4, padding: '2px 8px', fontSize: 12,
          }}>
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} style={{ margin: 0 }} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

interface DBPhoto {
  id: number
  filename: string | null
  mime_type: string
  source: string
  created_at: string
  data: string
}

export default function AdminDiagnosticPanel({ jobId, initial, onSaved, editingControlled, onEditingChange }: AdminDiagnosticPanelProps) {
  const { showToast } = useToast()
  const [editingInternal, setEditingInternal] = useState(false)
  const editing = editingControlled !== undefined ? editingControlled : editingInternal
  const setEditing = (v: boolean) => {
    if (editingControlled !== undefined) {
      onEditingChange?.(v)
    } else {
      setEditingInternal(v)
    }
  }
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<DiagData>(initial || {})
  const [photos, setPhotos] = useState<DBPhoto[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [expandedPhoto, setExpandedPhoto] = useState<DBPhoto | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ name: string; data: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/admin/jobs/${jobId}/photos?source=portal_diagnostic`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.success) setPhotos(json.photos)
      })
      .catch((err) => console.warn(`[AdminDiagnosticPanel] Nepodarilo sa načítať fotky (job ${jobId}):`, err))
      .finally(() => setPhotosLoaded(true))
  }, [jobId])

  const set = useCallback((field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  const setArr = useCallback((field: string, value: string[]) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  const setAppt = useCallback((idx: number, key: 'date' | 'time', value: string) => {
    setData(prev => {
      const appts = [...(prev.appointments || [{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }])]
      while (appts.length < 3) appts.push({ date: '', time: '' })
      appts[idx] = { ...appts[idx], [key]: value }
      return { ...prev, appointments: appts }
    })
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const maxFiles = 10 - pendingPhotos.length
    const toProcess = Array.from(files).slice(0, maxFiles)
    toProcess.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setPendingPhotos(prev => [...prev, { name: file.name, data: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [pendingPhotos.length])

  const removePendingPhoto = useCallback((idx: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...data, saved_at: new Date().toISOString() }
      if (pendingPhotos.length > 0) {
        payload.photos = pendingPhotos
      }
      const res = await fetch(`/api/admin/jobs/${jobId}/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
      showToast('Diagnostika uložená ✅')
      // Reload photos from DB so they appear in read mode
      if (pendingPhotos.length > 0) {
        setPendingPhotos([])
        fetch(`/api/admin/jobs/${jobId}/photos?source=portal_diagnostic`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then(json => { if (json?.success) setPhotos(json.photos) })
          .catch((err) => console.warn(`[AdminDiagnosticPanel] Nepodarilo sa znovu načítať fotky po uložení (job ${jobId}):`, err))
      }
      setEditing(false)
      onSaved?.(data)
    } catch {
      showToast('Chyba pri ukladaní ❌')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setData(initial || {})
    setPendingPhotos([])
    setEditing(false)
  }

  const ft = (data.fault_type || '') as FaultType

  const appts = data.appointments || []

  // ── READ mode ────────────────────────────────────────────────────

  if (!editing) {
    const hasData = !!(data.fault_type || data.problem_desc || data.saved_at)
    return (
      <div>
        {/* Lightbox */}
        {expandedPhoto && (
          <div
            onClick={() => setExpandedPhoto(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
              <img
                src={expandedPhoto.data}
                alt={expandedPhoto.filename || 'foto'}
                style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: -28, left: 0, right: 0,
                textAlign: 'center', color: '#ccc', fontSize: 12,
              }}>
                {expandedPhoto.filename} — {new Date(expandedPhoto.created_at).toLocaleString('sk-SK')}
              </div>
            </div>
          </div>
        )}

        {!hasData ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ color: 'var(--crm-text-3)', fontSize: 13, marginBottom: 10 }}>
              Formulár zatiaľ nevyplnený.
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'var(--gold, #C4A35A)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✏️ Vyplniť za klienta
            </button>
          </div>
        ) : (
          <div className="crm-field-grid">
            {/* Meta */}
            {data.saved_at && (
              <div className="crm-field full-width" style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                <span className="crm-field-label">Odoslané</span>
                <div className="crm-field-value readonly">
                  {new Date(data.saved_at).toLocaleString('sk-SK')}
                  {data.saved_by === 'operator' && ' — zadal operátor'}
                </div>
              </div>
            )}

            {/* Základné */}
            <ReadRow label="Typ klienta" value={data.client_type ? (CLIENT_TYPE_LABELS[data.client_type] || data.client_type) : undefined} />
            <ReadRow label="Typ poruchy" value={data.fault_type ? (FAULT_LABELS[data.fault_type] || data.fault_type) : undefined} />
            <ReadRow label="Typ nemovitosti" value={data.property_type ? (PROPERTY_LABELS[data.property_type] || data.property_type) : undefined} />
            <ReadRow label="Naliehavosť" value={data.urgency ? (URGENCY_LABELS[data.urgency] || data.urgency) : undefined} />
            <ReadRow label="Patro / byt" value={data.floor} />
            <ReadRow label="Poznámka k adrese" value={data.address_note} full />
            <ReadRow label="Popis problému" value={data.problem_desc} full />

            {/* Vodoinstalace */}
            {ft === 'vodoinstalater' && <>
              <ReadRow label="Typ problému" value={data.plumb_issue} />
              <ReadRow label="Umiestnenie" value={data.plumb_location} />
              <ReadRow label="Hlavný uzávěr" value={data.plumb_water_shutoff} />
              <ReadRow label="Závažnosť úniku" value={data.plumb_severity} />
              <ReadRow label="Materiál potrubí" value={data.plumb_pipe_material} />
              <ReadRow label="El. spotřebiče v blízkosti" value={data.plumb_electric_risk} />
              <ReadRow label="Poznámky" value={data.plumb_notes} full />
            </>}

            {/* Elektrika */}
            {ft === 'elektrikar' && <>
              <ReadRow label="Typ problému" value={data.elec_issue} />
              <ReadRow label="Rozsah výpadku" value={data.elec_scope} />
              <ReadRow label="Stav jističe" value={data.elec_breaker} />
              <ReadRow label="Zápach / stopy žáru" value={data.elec_burn} />
              <ReadRow label="Stáří inštalácie" value={data.elec_age} />
              <ReadRow label="Poznámky" value={data.elec_notes} full />
            </>}

            {/* Kotel */}
            {ft === 'kotel' && <>
              <ReadRow label="Značka" value={data.boiler_brand} />
              <ReadRow label="Model" value={data.boiler_model} />
              <ReadRow label="Palivo" value={data.boiler_fuel} />
              <ReadRow label="Stáří" value={data.boiler_age} />
              <ReadRow label="Problém" value={data.boiler_issue} />
              <ReadRow label="Chybový kód" value={data.boiler_error_code} />
              <ReadRow label="Tlak (bar)" value={data.boiler_pressure} />
              <ReadRow label="Zápach plynu" value={data.boiler_gas_smell} />
              <ReadRow label="Posledný servis" value={data.boiler_last_service} />
              <ReadRow label="Umiestnenie kotla" value={data.boiler_location} />
              <ReadRow label="Poznámky" value={data.boiler_notes} full />
            </>}

            {/* Spotrebič */}
            {ft === 'spotrebic' && <>
              <ReadRow label="Typ spotřebiče" value={data.appliance_type} />
              <ReadRow label="Značka a model" value={data.appliance_brand} />
              <ReadRow label="Stáří" value={data.appliance_age} />
              <ReadRow label="Inštalácia" value={data.appliance_install} />
              <ReadRow label="Porucha" value={data.appliance_issue} />
              <ReadRow label="Chybový kód" value={data.appliance_error} />
              <ReadRow label="Poznámky" value={data.appliance_notes} full />
            </>}

            {/* Deratizácia */}
            {ft === 'deratizace' && <>
              <ReadRow label="Typ problému" value={data.pest_type} />
              <ReadRow label="Trvanie" value={data.pest_duration} />
              <ReadRow label="Rozsah" value={data.pest_scope} />
              <ReadRow label="Bezp. info" value={data.pest_safety} />
              <ReadRow label="Predchádzajúca deratizácia" value={data.pest_previous} />
              <ReadRow label="Poznámky" value={data.pest_notes} full />
            </>}

            {/* Zámočník */}
            {ft === 'zamecnik' && <>
              <ReadRow label="Situácia" value={data.lock_situation} />
              <ReadRow label="Osoba vnútri" value={data.lock_person_inside} />
              <ReadRow label="Typ dverí" value={data.lock_door_type} />
              <ReadRow label="Typ zámku" value={data.lock_type} />
              <ReadRow label="Počet zámků" value={data.lock_count} />
              <ReadRow label="Poznámky" value={data.lock_notes} full />
            </>}

            {/* Plyn */}
            {ft === 'plynar' && <>
              <ReadRow label="Zápach plynu" value={data.gas_smell} />
              <ReadRow label="Zariadenie" value={data.gas_device} />
              <ReadRow label="Problém" value={data.gas_issue} />
              <ReadRow label="Vetranie" value={data.gas_ventilation} />
              <ReadRow label="Poznámky" value={data.gas_notes} full />
            </>}

            {/* Odpady */}
            {ft === 'odpady' && <>
              <ReadRow label="Umiestnenie" value={data.drain_location} />
              <ReadRow label="Závažnosť" value={data.drain_severity} />
              <ReadRow label="Typ objektu" value={data.drain_type} />
              <ReadRow label="Predchádzajúce čistenie" value={data.drain_previous} />
              <ReadRow label="Poznámky" value={data.drain_notes} full />
            </>}

            {/* Klimatizácia */}
            {ft === 'klimatizace' && <>
              <ReadRow label="Značka" value={data.ac_brand} />
              <ReadRow label="Stáří" value={data.ac_age} />
              <ReadRow label="Problém" value={data.ac_issue} />
              <ReadRow label="Typ jednotky" value={data.ac_type} />
              <ReadRow label="Poznámky" value={data.ac_notes} full />
            </>}

            {/* Tepelné čerpadlo */}
            {ft === 'tepelne_cerpadlo' && <>
              <ReadRow label="Značka" value={data.hp_brand} />
              <ReadRow label="Stáří" value={data.hp_age} />
              <ReadRow label="Problém" value={data.hp_issue} />
              <ReadRow label="Chybový kód" value={data.hp_error_code} />
              <ReadRow label="Poznámky" value={data.hp_notes} full />
            </>}

            {/* Solárne panely */}
            {ft === 'solarni_panely' && <>
              <ReadRow label="Počet panelov" value={data.sp_count} />
              <ReadRow label="Stáří systému" value={data.sp_age} />
              <ReadRow label="Problém" value={data.sp_issue} />
              <ReadRow label="Značka invertora" value={data.sp_inverter_brand} />
              <ReadRow label="Poznámky" value={data.sp_notes} full />
            </>}

            {/* Ostatné */}
            {(ft === 'ine' || !FAULT_LABELS[ft]) && data.problem_desc && (
              <ReadRow label="Popis prác" value={data.problem_desc} full />
            )}

            {/* Termíny */}
            {appts.filter(a => a.date).length > 0 && (
              <div className="crm-field full-width">
                <span className="crm-field-label">Navrhnuté termíny</span>
                <div className="crm-field-value readonly">
                  {appts.filter(a => a.date).map((a, i) => (
                    <div key={i}>{a.date} {a.time}</div>
                  ))}
                </div>
              </div>
            )}
            {data.schedule_note && <ReadRow label="Poznámka k termínom" value={data.schedule_note} full />}

            {/* Fotky z DB */}
            {photosLoaded && photos.length > 0 && (
              <div className="crm-field full-width">
                <span className="crm-field-label">Fotky ({photos.length})</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {photos.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setExpandedPhoto(p)}
                      style={{
                        width: 80, height: 80, borderRadius: 6, overflow: 'hidden',
                        border: '2px solid var(--crm-border)', cursor: 'zoom-in',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={p.data}
                        alt={p.filename || 'foto'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photosLoaded && photos.length === 0 && (data.photo_count ?? 0) > 0 && (
              <ReadRow label="Fotky" value={`${data.photo_count} fotiek (nenačítané)`} />
            )}
          </div>
        )}
      </div>
    )
  }

  // ── EDIT mode ────────────────────────────────────────────────────

  const apptEdit = [
    data.appointments?.[0] || { date: '', time: '' },
    data.appointments?.[1] || { date: '', time: '' },
    data.appointments?.[2] || { date: '', time: '' },
  ]

  const TIME_OPTIONS = [
    { value: '08:00-10:00', label: '08:00–10:00' }, { value: '10:00-12:00', label: '10:00–12:00' },
    { value: '12:00-14:00', label: '12:00–14:00' }, { value: '14:00-16:00', label: '14:00–16:00' },
    { value: '16:00-18:00', label: '16:00–18:00' }, { value: '18:00-20:00', label: '18:00–20:00' },
    { value: 'celý den', label: 'Celý den' },
  ]

  return (
    <div>
      {/* Edit header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-sm btn-outline" onClick={handleCancel} disabled={saving}>Zrušiť</button>
        <button className="btn btn-sm btn-gold" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Ukladám...' : '💾 Uložiť diagnostiku'}
        </button>
      </div>

      <div className="crm-field-grid">

        {/* ── Typ klienta + nehnuteľnosť ─── */}
        <EditSelect label="Typ klienta" field="client_type" value={data.client_type || ''} onChange={set} options={[
          { value: 'soukroma_osoba', label: '👤 Súkromná osoba' },
          { value: 'firma', label: '🏢 Firma' },
          { value: 'svj', label: '🏘️ SVB / SVJ (spoločenstvo vlastníkov)' },
        ]} />
        <EditSelect label="Typ nemovitosti" field="property_type" value={data.property_type || ''} onChange={set} options={[
          { value: 'byt', label: '🏢 Byt' },
          { value: 'dum', label: '🏠 Rodinný dům' },
          { value: 'komercni', label: '🏗️ Komerční objekt' },
          { value: 'spolecne_prostory', label: '🏛️ Spoločné priestory (chodba, suterén, schodisko)' },
        ]} />

        <EditSelect label="Naliehavosť" field="urgency" value={data.urgency || ''} onChange={set} options={[
          { value: 'kritická', label: '🔴 Kritická — aktívna havária' },
          { value: 'vysoká', label: '🟠 Vysoká — nefunkčná základná služba' },
          { value: 'střední', label: '🟡 Střední — problém s obmedzením' },
          { value: 'nízká', label: '🟢 Nízká — plánovaná oprava' },
        ]} />

        <EditText label="Patro / číslo bytu" field="floor" value={data.floor || ''} onChange={set} placeholder="3. patro, byt č. 12" />
        <EditText label="Poznámka k adrese" field="address_note" value={data.address_note || ''} onChange={set} placeholder="Vstup ze dvora..." full />

        {/* ── Typ poruchy — sem, za adresu ─── */}
        <EditSelect label="Typ poruchy" field="fault_type" value={data.fault_type || ''} onChange={set} full options={[
          { value: 'vodoinstalater', label: '🔧 Vodoinstalace' },
          { value: 'elektrikar', label: '⚡ Elektroinstalace' },
          { value: 'kotel', label: '🔥 Kotel a topení' },
          { value: 'plynar', label: '💨 Plynové zařízení' },
          { value: 'zamecnik', label: '🔑 Klíčová služba' },
          { value: 'odpady', label: '🚿 Ucpané odpady' },
          { value: 'spotrebic', label: '🧊 Elektrospotřebič' },
          { value: 'klimatizace', label: '❄️ Klimatizace' },
          { value: 'tepelne_cerpadlo', label: '🌡️ Tepelné čerpadlo' },
          { value: 'solarni_panely', label: '☀️ Solární panely' },
          { value: 'deratizace', label: '🐀 Deratizace' },
          { value: 'ine', label: '🔩 Ostatní práce' },
        ]} />

        {/* ── Vodoinstalace ── */}
        {ft === 'vodoinstalater' && <>
          <EditCheckboxes label="Typ problému" field="plumb_issue" value={data.plumb_issue || []} onChange={setArr} full options={[
            { value: 'únik vody', label: 'Únik vody' }, { value: 'ucpaný odpad', label: 'Ucpaný odpad' },
            { value: 'prasklé potrubí', label: 'Prasklé potrubí' }, { value: 'zamrzlé potrubí', label: 'Zamrzlé potrubí' },
            { value: 'nefunkční ventil', label: 'Nefunkční ventil' }, { value: 'jiné', label: 'Jiné' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditCheckboxes label="Umiestnenie" field="plumb_location" value={data.plumb_location || []} onChange={setArr} full options={[
            { value: 'koupelna', label: 'Koupelna' }, { value: 'kuchyně', label: 'Kuchyně' },
            { value: 'WC', label: 'WC' }, { value: 'sklep', label: 'Sklep' },
            { value: 'venku', label: 'Venkovní rozvod' }, { value: 'jiné', label: 'Jiné' },
          ]} />
          <EditSelect label="Hlavní uzávěr vody" field="plumb_water_shutoff" value={data.plumb_water_shutoff || ''} onChange={set} options={[
            { value: 'ano', label: 'Áno, je uzavretý' }, { value: 'ne', label: 'Nie, nedaří se najít' },
            { value: 'nevím', label: 'Neviem, kde je' },
          ]} />
          <EditSelect label="Závažnosť úniku" field="plumb_severity" value={data.plumb_severity || ''} onChange={set} options={[
            { value: 'kapání', label: 'Kapanie / drobný únik' }, { value: 'proud', label: 'Prúdenie vody' },
            { value: 'záplava', label: 'Záplava / vytopenie' }, { value: 'žádný únik', label: 'Bez viditeľného úniku' },
          ]} />
          <EditSelect label="Materiál potrubí" field="plumb_pipe_material" value={data.plumb_pipe_material || ''} onChange={set} options={[
            { value: 'měď', label: 'Medené' }, { value: 'plast', label: 'Plastové (PPR/PVC)' },
            { value: 'ocel', label: 'Oceľové / Pozinkované' }, { value: 'olovo', label: 'Olovené' },
          ]} />
          <EditSelect label="El. spotřebiče v blízkosti" field="plumb_electric_risk" value={data.plumb_electric_risk || ''} onChange={set} options={[
            { value: 'ano', label: 'Áno' }, { value: 'ne', label: 'Nie' }, { value: 'nejsem si jistý', label: 'Neviem' },
          ]} />
          <EditText label="Doplňující informace" field="plumb_notes" value={data.plumb_notes || ''} onChange={set} textarea placeholder="Stáří rozvodů, predchádzajúce opravy..." full />
        </>}

        {/* ── Elektrika ── */}
        {ft === 'elektrikar' && <>
          <EditCheckboxes label="Typ problému" field="elec_issue" value={data.elec_issue || []} onChange={setArr} full options={[
            { value: 'výpadek proudu', label: 'Výpadek proudu' }, { value: 'jiskření', label: 'Jiskření' },
            { value: 'zápach spáleniny', label: 'Zápach spáleniny' }, { value: 'nefunkční zásuvky', label: 'Nefunkčné zásuvky' },
            { value: 'blikající světla', label: 'Blikajúce svetlá' }, { value: 'vyhozený jistič', label: 'Vypadávajúci istič' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Rozsah výpadku" field="elec_scope" value={data.elec_scope || ''} onChange={set} options={[
            { value: 'jedna zásuvka', label: 'Jedna zásuvka / obvod' }, { value: 'celá místnost', label: 'Celá miestnosť' },
            { value: 'celé patro', label: 'Celé poschodie' }, { value: 'celý byt/dům', label: 'Celý byt / dom' },
          ]} />
          <EditSelect label="Stav jističe" field="elec_breaker" value={data.elec_breaker || ''} onChange={set} options={[
            { value: 'vypnutý', label: 'Istič je vyhodený' }, { value: 'nelze zapnout', label: 'Istič nelze zapnout' },
            { value: 'zapnutý', label: 'Istič zapnutý, prúd nejde' }, { value: 'nevím', label: 'Neviem kde je istič' },
          ]} />
          <EditSelect label="Zápach / stopy žáru" field="elec_burn" value={data.elec_burn || ''} onChange={set} options={[
            { value: 'ano', label: 'Áno' }, { value: 'ne', label: 'Nie' },
          ]} />
          <EditSelect label="Stáří elektroinstalace" field="elec_age" value={data.elec_age || ''} onChange={set} options={[
            { value: 'do 10 let', label: 'Do 10 rokov' }, { value: '10-30 let', label: '10–30 rokov' }, { value: 'nad 30 let', label: 'Nad 30 rokov' },
          ]} />
          <EditText label="Doplňující informace" field="elec_notes" value={data.elec_notes || ''} onChange={set} textarea placeholder="Čo sa robilo keď nastala porucha..." full />
        </>}

        {/* ── Kotel ── */}
        {ft === 'kotel' && <>
          <EditText label="Značka kotla" field="boiler_brand" value={data.boiler_brand || ''} onChange={set} placeholder="Junkers, Vaillant..." />
          <EditText label="Model kotla" field="boiler_model" value={data.boiler_model || ''} onChange={set} placeholder="Panther Condens 25 KKO" />
          <EditSelect label="Typ paliva" field="boiler_fuel" value={data.boiler_fuel || ''} onChange={set} options={[
            { value: 'plyn', label: 'Plynový' }, { value: 'elektřina', label: 'Elektrický' },
            { value: 'tuhá paliva', label: 'Na tuhá paliva' }, { value: 'tepelné čerpadlo', label: 'Tepelné čerpadlo' }, { value: 'nevím', label: 'Neviem' },
          ]} />
          <EditSelect label="Stáří kotla" field="boiler_age" value={data.boiler_age || ''} onChange={set} options={[
            { value: 'do 5 let', label: 'Do 5 rokov' }, { value: '5-10 let', label: '5–10 rokov' },
            { value: '10-15 let', label: '10–15 rokov' }, { value: 'nad 15 let', label: 'Nad 15 rokov' },
          ]} />
          <EditCheckboxes label="Čo nefunguje" field="boiler_issue" value={data.boiler_issue || []} onChange={setArr} full options={[
            { value: 'žádné topení', label: 'Netopí' }, { value: 'žádná teplá voda', label: 'Netečie teplá voda' },
            { value: 'únik vody', label: 'Únik vody z kotla' }, { value: 'hluk', label: 'Neobvyklé zvuky' },
            { value: 'chybový kód', label: 'Chybový kód' }, { value: 'nenastartuje', label: 'Kotel nenastartuje' },
            { value: 'nízký tlak', label: 'Nízky/vysoký tlak' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditText label="Chybový kód" field="boiler_error_code" value={data.boiler_error_code || ''} onChange={set} placeholder="F28, E10, EA..." />
          <EditText label="Tlak (bar)" field="boiler_pressure" value={data.boiler_pressure || ''} onChange={set} placeholder="0.5, 1.2, 2.8" />
          <EditSelect label="Zápach plynu" field="boiler_gas_smell" value={data.boiler_gas_smell || ''} onChange={set} options={[
            { value: 'ano', label: '🔴 Áno — OPUSTITE PRIESTOR' }, { value: 'ne', label: '✅ Nie' },
          ]} />
          <EditSelect label="Posledný servis" field="boiler_last_service" value={data.boiler_last_service || ''} onChange={set} options={[
            { value: 'do 1 roku', label: 'Do 1 roka' }, { value: '1-2 roky', label: '1–2 roky' },
            { value: 'více než 2 roky', label: 'Viac ako 2 roky' }, { value: 'nikdy', label: 'Nikdy nebol servisovaný' },
          ]} />
          <EditText label="Umiestnenie kotla" field="boiler_location" value={data.boiler_location || ''} onChange={set} placeholder="Kúpeľňa, technická miestnosť..." />
          <EditText label="Doplňující informace" field="boiler_notes" value={data.boiler_notes || ''} onChange={set} textarea placeholder="Čokoľvek čo pomôže technikovi..." full />
        </>}

        {/* ── Spotrebič ── */}
        {ft === 'spotrebic' && <>
          <EditSelect label="Typ spotrebiča" field="appliance_type" value={data.appliance_type || ''} onChange={set} options={[
            { value: 'pračka', label: 'Práčka' }, { value: 'sušička', label: 'Sušička' }, { value: 'myčka', label: 'Umývačka' },
            { value: 'lednička', label: 'Chladnička / Mrazák' }, { value: 'trouba', label: 'Rúra / Sporák' },
            { value: 'varná deska', label: 'Varná doska' }, { value: 'bojler', label: 'Elektrický bojler' },
            { value: 'klimatizace', label: 'Klimatizácia' }, { value: 'jiný', label: 'Iný spotrebič' },
          ]} />
          <EditText label="Značka a model" field="appliance_brand" value={data.appliance_brand || ''} onChange={set} placeholder="Bosch SMS46KI01E" />
          <EditSelect label="Stáří" field="appliance_age" value={data.appliance_age || ''} onChange={set} options={[
            { value: 'do 2 let', label: 'Do 2 rokov' }, { value: '2-5 let', label: '2–5 rokov' },
            { value: '5-10 let', label: '5–10 rokov' }, { value: 'nad 10 let', label: 'Nad 10 rokov' },
          ]} />
          <EditSelect label="Inštalácia" field="appliance_install" value={data.appliance_install || ''} onChange={set} options={[
            { value: 'volně stojící', label: 'Voľne stojaci' }, { value: 'vestavný', label: 'Vstavaný' },
          ]} />
          <EditCheckboxes label="Porucha" field="appliance_issue" value={data.appliance_issue || []} onChange={setArr} full options={[
            { value: 'nezapne se', label: 'Nezapne sa' }, { value: 'chybový kód', label: 'Chybový kód' },
            { value: 'únik vody', label: 'Únik vody' }, { value: 'hluk', label: 'Neobvyklé zvuky' },
            { value: 'zápach', label: 'Zápach / dym' }, { value: 'nefunguje správně', label: 'Nefunguje správne' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditText label="Chybový kód" field="appliance_error" value={data.appliance_error || ''} onChange={set} placeholder="E15, F21..." />
          <EditText label="Doplňující informace" field="appliance_notes" value={data.appliance_notes || ''} onChange={set} textarea placeholder="Prejavy poruchy, kedy nastal problém..." full />
        </>}

        {/* ── Deratizácia ── */}
        {ft === 'deratizace' && <>
          <EditCheckboxes label="Typ problému" field="pest_type" value={data.pest_type || []} onChange={setArr} full options={[
            { value: 'myši', label: 'Myši' }, { value: 'krysy', label: 'Krysy / potkany' },
            { value: 'švábi', label: 'Šváby' }, { value: 'mravenci', label: 'Mravce' },
            { value: 'štěnice', label: 'Štiepavce' }, { value: 'vosy', label: 'Vosy / sršne' },
            { value: 'plísně', label: 'Plesne' }, { value: 'jiné', label: 'Iné' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Trvanie problému" field="pest_duration" value={data.pest_duration || ''} onChange={set} options={[
            { value: 'dny', label: 'Niekoľko dní' }, { value: 'týdny', label: 'Niekoľko týždňov' }, { value: 'měsíce', label: 'Dlhšie ako mesiac' },
          ]} />
          <EditSelect label="Rozsah zasažení" field="pest_scope" value={data.pest_scope || ''} onChange={set} options={[
            { value: 'jedna místnost', label: 'Jedna miestnosť' }, { value: 'více místností', label: 'Viac miestností' }, { value: 'celý objekt', label: 'Celý objekt' },
          ]} />
          <EditCheckboxes label="Bezpečnostné info" field="pest_safety" value={data.pest_safety || []} onChange={setArr} full options={[
            { value: 'malé děti', label: 'Malé deti' }, { value: 'domácí zvířata', label: 'Domáce zvieratá' },
            { value: 'alergie', label: 'Alergia / astma' }, { value: 'těhotná', label: 'Tehotná osoba' }, { value: 'nic z uvedeného', label: 'Nič z uvedeného' },
          ]} />
          <EditSelect label="Predchádzajúca deratizácia" field="pest_previous" value={data.pest_previous || ''} onChange={set} options={[
            { value: 'ano', label: 'Áno' }, { value: 'ne', label: 'Nie' },
          ]} />
          <EditText label="Doplňující informace" field="pest_notes" value={data.pest_notes || ''} onChange={set} textarea placeholder="Kde ste škodcov videli, aké stopy..." full />
        </>}

        {/* ── Zámočník ── */}
        {ft === 'zamecnik' && <>
          <EditSelect label="Situácia" field="lock_situation" value={data.lock_situation || ''} onChange={set} full options={[
            { value: 'zabouchnuté', label: 'Zabuchnuté dvere (kľúče vnútri)' }, { value: 'ztracené klíče', label: 'Stratené / ukradnuté kľúče' },
            { value: 'poškozený zámek', label: 'Poškodený / zaseknutý zámok' }, { value: 'zlomený klíč', label: 'Zlomený kľúč v zámku' },
            { value: 'po vloupání', label: 'Poškodenie po vlúpaní' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Je vnútri uzamknutá osoba?" field="lock_person_inside" value={data.lock_person_inside || ''} onChange={set} options={[
            { value: 'ano', label: '🔴 Áno' }, { value: 'ne', label: 'Nie' },
          ]} />
          <EditSelect label="Typ dverí" field="lock_door_type" value={data.lock_door_type || ''} onChange={set} options={[
            { value: 'dřevěné', label: 'Drevené' }, { value: 'kovové', label: 'Kovové / bezpečnostné' },
            { value: 'plastové', label: 'Plastové' }, { value: 'skleněné', label: 'Sklenené' },
          ]} />
          <EditSelect label="Typ zámku" field="lock_type" value={data.lock_type || ''} onChange={set} options={[
            { value: 'cylindrický', label: 'Cylindrický (vložkový)' }, { value: 'zadlabávací', label: 'Zadlabávací' },
            { value: 'bezpečnostní', label: 'Bezpečnostný / trezorový' }, { value: 'elektronický', label: 'Elektronický / kódový' },
          ]} />
          <EditSelect label="Počet zámkov" field="lock_count" value={data.lock_count || ''} onChange={set} options={[
            { value: '1', label: '1 zámok' }, { value: '2', label: '2 zámky' }, { value: '3+', label: '3 a viac' },
          ]} />
          <EditText label="Doplňující informace" field="lock_notes" value={data.lock_notes || ''} onChange={set} textarea placeholder="Značka zámku, prístup k dverám, poschodie..." full />
        </>}

        {/* ── Plyn ── */}
        {ft === 'plynar' && <>
          <EditSelect label="Cítite zápach plynu?" field="gas_smell" value={data.gas_smell || ''} onChange={set} full options={[
            { value: 'ano', label: '🔴 Áno — OPUSTITE PRIESTOR' }, { value: 'ne', label: '✅ Nie' }, { value: 'občas', label: '🟡 Občas / slabý' },
          ]} />
          <EditSelect label="Typ plynového zariadenia" field="gas_device" value={data.gas_device || ''} onChange={set} options={[
            { value: 'sporák', label: 'Plynový sporák / varná doska' }, { value: 'kotel', label: 'Plynový kotol' },
            { value: 'karma', label: 'Plynová karma / prietokový ohrev' }, { value: 'rozvod', label: 'Plynový rozvod / potrubí' },
            { value: 'jiné', label: 'Iné plynové zariadenie' },
          ]} />
          <EditCheckboxes label="Problém" field="gas_issue" value={data.gas_issue || []} onChange={setArr} full options={[
            { value: 'únik plynu', label: 'Zápach / únik plynu' }, { value: 'nefunkční', label: 'Zariadenie nefunguje' },
            { value: 'revize', label: 'Potreba revízie' }, { value: 'špatný plamen', label: 'Zlý plameň (žltý/nestabilný)' }, { value: 'jiné', label: 'Iné' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Je zabezpečené vetranie?" field="gas_ventilation" value={data.gas_ventilation || ''} onChange={set} options={[
            { value: 'ano', label: '✅ Áno, okná otvorené' }, { value: 'ne', label: '🔴 Nie' },
          ]} />
          <EditText label="Doplňující informace" field="gas_notes" value={data.gas_notes || ''} onChange={set} textarea placeholder="Typ zariadenia, stáří, posledná revízia..." full />
        </>}

        {/* ── Odpady ── */}
        {ft === 'odpady' && <>
          <EditCheckboxes label="Kde je problém?" field="drain_location" value={data.drain_location || []} onChange={setArr} full options={[
            { value: 'WC', label: 'WC / toaleta' }, { value: 'kuchyňský dřez', label: 'Kuchynský drez' },
            { value: 'sprcha/vana', label: 'Sprchový kút / vaňa' }, { value: 'umyvadlo', label: 'Umývadlo' },
            { value: 'kanalizace', label: 'Hlavná kanalizácia / stúpačka' }, { value: 'jiné', label: 'Iné' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Závažnosť" field="drain_severity" value={data.drain_severity || ''} onChange={set} options={[
            { value: 'pomalý odtok', label: 'Pomalý odtok' }, { value: 'neodtéká', label: 'Voda vôbec neodteká' },
            { value: 'vrací se', label: 'Voda sa vracia späť' }, { value: 'zapáchá', label: 'Silný zápach z odtoku' },
          ]} />
          <EditSelect label="Typ objektu" field="drain_type" value={data.drain_type || ''} onChange={set} options={[
            { value: 'byt', label: 'Byt v bytovom dome' }, { value: 'rodinný dům', label: 'Rodinný dom' }, { value: 'komerční', label: 'Komerčný objekt' },
          ]} />
          <EditSelect label="Predchádzajúce čistenie" field="drain_previous" value={data.drain_previous || ''} onChange={set} options={[
            { value: 'ne', label: 'Nie' }, { value: 'zvon', label: 'Áno, píst (zvon)' },
            { value: 'chemie', label: 'Áno, chemický čistič' }, { value: 'obojí', label: 'Áno, oboje' },
          ]} />
          <EditText label="Doplňující informace" field="drain_notes" value={data.drain_notes || ''} onChange={set} textarea placeholder="Ako dlho problém trvá, čo upchanie spôsobilo..." full />
        </>}

        {/* ── Klimatizácia ── */}
        {ft === 'klimatizace' && <>
          <EditText label="Značka" field="ac_brand" value={data.ac_brand || ''} onChange={set} placeholder="Daikin, Mitsubishi, Samsung..." />
          <EditSelect label="Stáří" field="ac_age" value={data.ac_age || ''} onChange={set} options={[
            { value: 'do 3 let', label: 'Do 3 rokov' }, { value: '3-7 let', label: '3–7 rokov' },
            { value: '7-15 let', label: '7–15 rokov' }, { value: 'nad 15 let', label: 'Nad 15 rokov' },
          ]} />
          <EditCheckboxes label="Problém" field="ac_issue" value={data.ac_issue || []} onChange={setArr} full options={[
            { value: 'nechladí', label: 'Nechladí / netopí' }, { value: 'únik vody', label: 'Únik vody / kondenzátu' },
            { value: 'hluk', label: 'Neobvyklý hluk' }, { value: 'zápach', label: 'Zápach' },
            { value: 'chybový kód', label: 'Chybový kód' }, { value: 'nezapne', label: 'Nezapne sa' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditSelect label="Typ jednotky" field="ac_type" value={data.ac_type || ''} onChange={set} options={[
            { value: 'nástěnná split', label: 'Nástenná split' }, { value: 'multisplit', label: 'Multisplit' },
            { value: 'kazetová', label: 'Kazetová (stropná)' }, { value: 'mobilní', label: 'Mobilná' }, { value: 'nevím', label: 'Neviem' },
          ]} />
          <EditText label="Doplňující informace" field="ac_notes" value={data.ac_notes || ''} onChange={set} textarea placeholder="Kedy nastal problém, chybový kód..." full />
        </>}

        {/* ── Tepelné čerpadlo ── */}
        {ft === 'tepelne_cerpadlo' && <>
          <EditText label="Značka" field="hp_brand" value={data.hp_brand || ''} onChange={set} placeholder="Daikin, Viessmann, Nibe..." />
          <EditSelect label="Stáří" field="hp_age" value={data.hp_age || ''} onChange={set} options={[
            { value: 'do 3 let', label: 'Do 3 rokov' }, { value: '3-7 let', label: '3–7 rokov' },
            { value: '7-15 let', label: '7–15 rokov' }, { value: 'nad 15 let', label: 'Nad 15 rokov' },
          ]} />
          <EditCheckboxes label="Problém" field="hp_issue" value={data.hp_issue || []} onChange={setArr} full options={[
            { value: 'netopí', label: 'Netopí / nechladí' }, { value: 'hluk', label: 'Neobvyklý hluk' },
            { value: 'chybový kód', label: 'Chybový kód' }, { value: 'únik chladiva', label: 'Podozrenie na únik chladiva' },
            { value: 'zamrzá', label: 'Vonkajšia jednotka zamŕza' }, { value: 'teplá voda', label: 'Problém s teplou vodou' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditText label="Chybový kód" field="hp_error_code" value={data.hp_error_code || ''} onChange={set} placeholder="E01, F12, H71..." />
          <EditText label="Doplňující informace" field="hp_notes" value={data.hp_notes || ''} onChange={set} textarea placeholder="Typ čerpadla, inštalácia..." full />
        </>}

        {/* ── Solárne panely ── */}
        {ft === 'solarni_panely' && <>
          <EditSelect label="Počet panelov" field="sp_count" value={data.sp_count || ''} onChange={set} options={[
            { value: '1-5', label: '1–5' }, { value: '6-15', label: '6–15' },
            { value: '16-30', label: '16–30' }, { value: 'nad 30', label: 'Nad 30' },
          ]} />
          <EditSelect label="Stáří systému" field="sp_age" value={data.sp_age || ''} onChange={set} options={[
            { value: 'do 3 let', label: 'Do 3 rokov' }, { value: '3-7 let', label: '3–7 rokov' },
            { value: '7-15 let', label: '7–15 rokov' }, { value: 'nad 15 let', label: 'Nad 15 rokov' },
          ]} />
          <EditCheckboxes label="Problém" field="sp_issue" value={data.sp_issue || []} onChange={setArr} full options={[
            { value: 'nízký výkon', label: 'Nízky výkon / nulová produkcia' }, { value: 'chyba střídače', label: 'Chybový kód striedača' },
            { value: 'poškozený panel', label: 'Fyzické poškodenie panela' }, { value: 'únik', label: 'Zatekanie pri paneloch' },
            { value: 'monitoring', label: 'Nefunguje monitoring / aplikácia' },
          ]} />
          <EditText label="Popis problému" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo sa stalo, čo nefunguje..." full />
          <EditText label="Značka invertora" field="sp_inverter_brand" value={data.sp_inverter_brand || ''} onChange={set} placeholder="Fronius, SolarEdge, Huawei..." />
          <EditText label="Doplňující informace" field="sp_notes" value={data.sp_notes || ''} onChange={set} textarea placeholder="Typ panelov, typ systému (fotovoltaika / termálny)..." full />
        </>}

        {/* ── Iné / bez mapovania — len popis ── */}
        {(ft === 'ine' || (ft !== '' && !FAULT_LABELS[ft])) && (
          <EditText label="Popis požadovaných prác" field="problem_desc" value={data.problem_desc || ''} onChange={set} textarea placeholder="Čo je potrebné opraviť, vymeniť alebo skontrolovať..." full />
        )}

        {/* ── Fotky od klienta ── */}
        <div className="crm-field full-width" style={{ marginTop: 8 }}>
          <span className="crm-field-label" style={{ marginBottom: 6, display: 'block' }}>
            Fotky od klienta
          </span>

          {/* Existing DB photos */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {photos.map(p => (
                <div key={p.id} style={{
                  width: 72, height: 72, borderRadius: 6, overflow: 'hidden',
                  border: '2px solid var(--crm-border)', position: 'relative',
                }}>
                  <img src={p.data} alt={p.filename || 'foto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9,
                    textAlign: 'center', padding: '1px 2px',
                  }}>uložená</div>
                </div>
              ))}
            </div>
          )}

          {/* Pending photos (not yet saved) */}
          {pendingPhotos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {pendingPhotos.map((p, idx) => (
                <div key={idx} style={{
                  width: 72, height: 72, borderRadius: 6, overflow: 'hidden',
                  border: '2px solid var(--gold, #C4A35A)', position: 'relative',
                }}>
                  <img src={p.data} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removePendingPhoto(idx)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: 'none', borderRadius: '50%', width: 20, height: 20,
                      fontSize: 12, cursor: 'pointer', lineHeight: '18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(196,163,90,0.8)', color: '#fff', fontSize: 9,
                    textAlign: 'center', padding: '1px 2px',
                  }}>nová</div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingPhotos.length >= 10}
            style={{
              background: 'var(--crm-bg-2, #f5f5f5)',
              border: '2px dashed var(--crm-border, #ddd)',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              color: 'var(--dark, #333)',
              cursor: pendingPhotos.length >= 10 ? 'not-allowed' : 'pointer',
              width: '100%',
              fontWeight: 500,
            }}
          >
            📷 Pridať fotky ({photos.length + pendingPhotos.length}/10)
          </button>
          <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 4 }}>
            Fotky poruchy, typového štítku, priestoru — pomáhajú diagnostickému mozgu
          </div>
        </div>

        {/* ── Navrhnuté termíny ── */}
        <div className="crm-field full-width" style={{ marginTop: 8 }}>
          <span className="crm-field-label" style={{ marginBottom: 6, display: 'block' }}>Navrhnuté termíny (zákazníkom)</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, gridColumn: '1 / -1' }}>
                <div className="crm-field">
                  <span className="crm-field-label" style={{ fontSize: 11 }}>{i + 1}. termín — dátum</span>
                  <input className="crm-field-input" type="date" value={apptEdit[i]?.date || ''} onChange={e => setAppt(i, 'date', e.target.value)} />
                </div>
                <div className="crm-field">
                  <span className="crm-field-label" style={{ fontSize: 11 }}>Časový rozsah</span>
                  <select className="crm-field-input" value={apptEdit[i]?.time || ''} onChange={e => setAppt(i, 'time', e.target.value)}>
                    <option value="">— Vyberte —</option>
                    {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <EditText label="Poznámka k termínom" field="schedule_note" value={data.schedule_note || ''} onChange={set} placeholder="Preferuje dopoludnie, volať vopred..." full />

      </div>
    </div>
  )
}
