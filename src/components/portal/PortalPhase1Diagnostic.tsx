'use client'

/**
 * PortalPhase1Diagnostic — 3-step diagnostic wizard.
 *
 *   Step 1: Údaje (contact + address + fault type + urgency — merged)
 *   Step 2: Diagnostika (conditional panel per fault type)
 *   Step 3: Termín (photos + appointments + consent)
 *
 * Submits to portal diagnostic API for processing.
 */

import { useState, useCallback, useRef } from 'react'
import { type Job, type TimeSlot } from '@/data/mockData'
import { useToast } from '@/components/ui/Toast'
import { type PortalTexts } from './portalLocale'

interface Phase1Props {
  job: Job
  token: string
  timeSlots: TimeSlot[]
  clientEmail: string
  onEmailChange: (email: string) => void
  t: PortalTexts
  onSubmitted?: () => void
}

// ── Image compression ──────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string
      const img = document.createElement('img')
      img.onerror = () => {
        // fallback: return raw dataUrl if image can't be decoded
        resolve(dataUrl)
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          let w = img.width
          let h = img.height
          if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch {
          resolve(dataUrl)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

// ── Fault types ────────────────────────────────────────────────────
type FaultType =
  | 'vodoinstalater' | 'elektrikar' | 'kotel' | 'topeni' | 'spotrebic'
  | 'deratizace' | 'zamecnik' | 'plynar' | 'odpady'
  | 'klimatizace' | 'tepelne_cerpadlo' | 'solarni_panely' | 'ine'

const FAULT_OPTIONS: { value: FaultType; icon: string; label: string; group?: string }[] = [
  // Emergency (nejčastější)
  { value: 'vodoinstalater', icon: '🔧', label: 'Vodoinstalace (únik vody, prasklé potrubí)', group: 'Havarijní' },
  { value: 'elektrikar', icon: '⚡', label: 'Elektroinstalace (výpadek proudu, jiskření)', group: 'Havarijní' },
  { value: 'kotel', icon: '🔥', label: 'Kotel (závada kotle, neteče teplá voda)', group: 'Havarijní' },
  { value: 'topeni', icon: '🌡️', label: 'Topení a radiátory (netopí, únik z radiátoru)', group: 'Havarijní' },
  { value: 'plynar', icon: '💨', label: 'Plynové zařízení (únik plynu, plynová kontrola)', group: 'Havarijní' },
  { value: 'zamecnik', icon: '🔑', label: 'Klíčová služba (zamčené dveře, výměna zámku)', group: 'Havarijní' },
  { value: 'odpady', icon: '🚿', label: 'Ucpané odpady (WC, odtok, kanalizace)', group: 'Havarijní' },
  // Technika
  { value: 'spotrebic', icon: '🧊', label: 'Oprava elektrospotřebiče (pračka, lednička aj.)', group: 'Technika' },
  { value: 'klimatizace', icon: '❄️', label: 'Klimatizace (závada, servis, únik chladiva)', group: 'Technika' },
  { value: 'tepelne_cerpadlo', icon: '🌡️', label: 'Tepelné čerpadlo (závada, nefunkčnost)', group: 'Technika' },
  { value: 'solarni_panely', icon: '☀️', label: 'Solární panely (porucha, nízký výkon)', group: 'Technika' },
  // Ostatní
  { value: 'deratizace', icon: '🐀', label: 'Deratizace a dezinfekce (hlodavci, hmyz, plísně)', group: 'Ostatní' },
  { value: 'ine', icon: '🔩', label: 'Jiný typ závady / ostatní práce', group: 'Ostatní' },
]

// ── CRM category mapping ──────────────────────────────────────────
// Maps form fault_type → CRM SPECIALIZATIONS value (exact match for DB)
// When multiple CRM categories apply, sub-fields disambiguate in webhook
const FAULT_TO_CRM: Record<FaultType, string> = {
  vodoinstalater:   '01. Plumber',
  elektrikar:       '10. Electrician',
  kotel:            '02. Heating',        // sub-resolved by boilerFuel: plyn→'04. Gas boiler', elektřina→'05. Electric boiler'
  topeni:           '02. Heating',        // radiátory, podlahové topení (bez kotle)
  plynar:           '03. Gasman',
  zamecnik:         '14. Keyservice',
  odpady:           '08. Unblocking',     // large jobs auto-escalated by webhook to '09. Unblocking (big)'
  spotrebic:        '11. Electronics',
  klimatizace:      '12. Airconditioning',
  tepelne_cerpadlo: '06. Thermal pumps',
  solarni_panely:   '07. Solar panels',
  deratizace:       '20. Deratization',
  ine:              '',                   // uses job.category as-is
}

// Maps CRM job.category → fault type pre-selection + optional boilerFuel hint
const CRM_TO_FAULT: Record<string, { faultType: FaultType; boilerFuel?: string }> = {
  '01. Plumber':         { faultType: 'vodoinstalater' },
  '02. Heating':         { faultType: 'topeni' },
  '02. Gas Boiler':      { faultType: 'kotel', boilerFuel: 'plyn' },
  '03. Gasman':          { faultType: 'plynar' },
  '03. Electrician':     { faultType: 'elektrikar' },
  '04. Gas boiler':      { faultType: 'kotel', boilerFuel: 'plyn' },
  '04. Locksmith':       { faultType: 'zamecnik' },
  '05. Electric boiler': { faultType: 'kotel', boilerFuel: 'elektřina' },
  '06. Thermal pumps':   { faultType: 'tepelne_cerpadlo' },
  '07. Solar panels':    { faultType: 'solarni_panely' },
  '08. Unblocking':      { faultType: 'odpady' },
  '09. Unblocking (big)':{ faultType: 'odpady' },
  '10. Electrician':     { faultType: 'elektrikar' },
  '11. Electronics':     { faultType: 'spotrebic' },
  '12. Airconditioning': { faultType: 'klimatizace' },
  '14. Keyservice':      { faultType: 'zamecnik' },
  '18. Painting':        { faultType: 'ine' },
  '20. Deratization':    { faultType: 'deratizace' },
  '21. Water systems':   { faultType: 'vodoinstalater' },
  'Instalatér - vodoinstalace': { faultType: 'vodoinstalater' },
}

/** Resolve CRM category from form data — handles sub-disambiguation */
function resolveCrmCategory(form: FormState): string {
  const ft = form.faultType as FaultType
  if (!ft) return ''
  // Kotel → sub-resolve by fuel type
  if (ft === 'kotel') {
    if (form.boilerFuel === 'plyn') return '04. Gas boiler'
    if (form.boilerFuel === 'elektřina') return '05. Electric boiler'
    if (form.boilerFuel === 'tepelné čerpadlo') return '06. Thermal pumps'
    return '02. Heating' // default
  }
  return FAULT_TO_CRM[ft] || ''
}

const URGENCY_OPTIONS = [
  { value: 'kritická', icon: '🔴', label: 'Kritická — aktivní havárie' },
  { value: 'vysoká', icon: '🟠', label: 'Vysoká — nefunkční základní služba' },
  { value: 'střední', icon: '🟡', label: 'Střední — problém s omezením' },
  { value: 'nízká', icon: '🟢', label: 'Nízká — plánovaná oprava' },
]

// CLIENT_TYPE_OPTIONS and PROPERTY_OPTIONS are built inside the component using t (translations)

const TIME_RANGE_OPTIONS = [
  { value: '08:00-10:00', label: '08:00 – 10:00' },
  { value: '10:00-12:00', label: '10:00 – 12:00' },
  { value: '12:00-14:00', label: '12:00 – 14:00' },
  { value: '14:00-16:00', label: '14:00 – 16:00' },
  { value: '16:00-18:00', label: '16:00 – 18:00' },
  { value: '18:00-20:00', label: '18:00 – 20:00' },
  { value: 'celý den', label: 'Celý den' },
]

// ── Step labels ────────────────────────────────────────────────────
const STEP_LABELS = ['Údaje', 'Diagnostika', 'Termín']

// ── Form state type ────────────────────────────────────────────────
interface FormState {
  // Step 1 – contact
  clientType: string
  clientName: string
  street: string
  city: string
  zip: string
  floor: string
  addressNote: string
  phone: string
  email: string
  propertyType: string
  // Step 2 – fault
  faultType: FaultType | ''
  problemDesc: string
  urgency: string
  // Step 3 – diagnostics (all fields for all 6 panels)
  plumbIssue: string[]
  plumbLocation: string[]
  plumbWaterShutoff: string
  plumbSeverity: string
  plumbPipeMaterial: string
  plumbElectricRisk: string
  plumbFaucetType: string
  plumbFaucetLocation: string
  plumbFaucetBrand: string
  plumbFaucetSymptom: string[]
  plumbNotes: string
  elecIssue: string[]
  elecScope: string
  elecBreaker: string
  elecBurn: string
  elecAge: string
  elecNotes: string
  boilerBrand: string
  boilerModel: string
  boilerFuel: string
  boilerAge: string
  boilerIssue: string[]
  boilerErrorCode: string
  boilerPressure: string
  boilerGasSmell: string
  boilerLastService: string
  boilerLocation: string
  boilerNotes: string
  // Step 3C2 – Topení (radiátory, podlahové topení)
  heatSystem: string
  heatIssue: string[]
  heatRadiatorCount: string
  heatFloorType: string
  heatAge: string
  heatNotes: string
  applianceType: string
  applianceBrand: string
  applianceAge: string
  applianceInstall: string
  applianceIssue: string[]
  applianceError: string
  applianceNotes: string
  pestType: string[]
  pestDuration: string
  pestScope: string
  pestSafety: string[]
  pestPrevious: string
  pestNotes: string
  lockSituation: string
  lockPersonInside: string
  lockDoorType: string
  lockType: string
  lockCount: string
  lockNotes: string
  // Step 3G – Gas (plynár)
  gasSmell: string
  gasDevice: string
  gasIssue: string[]
  gasVentilation: string
  gasNotes: string
  // Step 3H – Unblocking (odpady)
  drainLocation: string[]
  drainSeverity: string
  drainType: string
  drainPrevious: string
  drainNotes: string
  drainScope: string
  drainFloor: string
  drainPreviousCleaning: string[]
  drainAge: string
  // WC sub-panel (inside vodoinstalater panel, when 'WC' selected)
  wcSymptom: string[]
  wcTankType: string
  wcAge: string
  // Step 3I – Klimatizace
  acBrand: string
  acAge: string
  acIssue: string[]
  acType: string
  acNotes: string
  // Step 3J – Tepelné čerpadlo
  hpBrand: string
  hpAge: string
  hpIssue: string[]
  hpErrorCode: string
  hpNotes: string
  // Step 3K – Solární panely
  spCount: string
  spAge: string
  spIssue: string[]
  spInverterBrand: string
  spNotes: string
  // EA coverage detection fields
  problemCause: string
  repairScope: string
  doorType: string
  lockCylinderType: string
  mechanicalDamage: string
  // Step 4 – appointments + consent
  date1: string
  time1: string
  date2: string
  time2: string
  date3: string
  time3: string
  scheduleNote: string
  consent: boolean
}

// ── Component ──────────────────────────────────────────────────────
export function PortalPhase1Diagnostic({ job, token, clientEmail, onEmailChange, t, onSubmitted }: Phase1Props) {
  const { showToast } = useToast()
  const [formStep, setFormStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photos, setPhotos] = useState<{ name: string; data: string }[]>([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [editingContact, setEditingContact] = useState(false)
  const [showAddressDetails, setShowAddressDetails] = useState(false)
  const [showLockDetails, setShowLockDetails] = useState(false)
  const [visibleSlots, setVisibleSlots] = useState(1)

  // Localized options (built from translations)
  const CLIENT_TYPE_OPTIONS = [
    { value: 'soukroma_osoba', icon: '👤', label: t.diagClientTypePrivate },
    { value: 'firma', icon: '🏢', label: t.diagClientTypeCompany },
    { value: 'svj', icon: '🏘️', label: t.diagClientTypeSvj },
  ]

  const PROPERTY_OPTIONS = [
    { value: 'byt', icon: '🏢', label: t.diagPropertyFlat },
    { value: 'dum', icon: '🏠', label: t.diagPropertyHouse },
    { value: 'komercni', icon: '🏗️', label: t.diagPropertyCommercial },
    { value: 'spolecne_prostory', icon: '🏛️', label: t.diagPropertyCommonAreas },
  ]

  // Pre-select fault type + boilerFuel from job.category (customer can still change)
  // Unmapped categories → 'ine' so the required field is not empty
  const categoryHint = CRM_TO_FAULT[job.category || ''] ?? { faultType: 'ine' as FaultType }

  // Extract brand/model/error from custom_fields (populated by email parser)
  const cf = (job.custom_fields || {}) as Record<string, unknown>
  const emailBrand = (cf.appliance_brand as string) || ''
  const emailModel = (cf.appliance_model as string) || ''
  const emailError = (cf.error_code as string) || ''

  const [form, setForm] = useState<FormState>({
    clientType: '',
    clientName: job.customer_name || '',
    street: job.customer_address || '',
    city: job.customer_city || '',
    zip: job.customer_psc || '',
    floor: '',
    addressNote: '',
    phone: job.customer_phone || '',
    email: clientEmail,
    propertyType: '',
    faultType: categoryHint?.faultType || '',
    problemDesc: job.description || '',
    urgency: '',
    plumbIssue: [], plumbLocation: [], plumbWaterShutoff: '', plumbSeverity: '', plumbPipeMaterial: '', plumbElectricRisk: '', plumbFaucetType: '', plumbFaucetLocation: '', plumbFaucetBrand: '', plumbFaucetSymptom: [], plumbNotes: '',
    elecIssue: [], elecScope: '', elecBreaker: '', elecBurn: '', elecAge: '', elecNotes: '',
    boilerBrand: emailBrand, boilerModel: emailModel, boilerFuel: categoryHint?.boilerFuel || '', boilerAge: '', boilerIssue: [], boilerErrorCode: emailError, boilerPressure: '', boilerGasSmell: '', boilerLastService: '', boilerLocation: '', boilerNotes: '',
    heatSystem: '', heatIssue: [], heatRadiatorCount: '', heatFloorType: '', heatAge: '', heatNotes: '',
    applianceType: '', applianceBrand: emailBrand, applianceAge: '', applianceInstall: '', applianceIssue: [], applianceError: emailError, applianceNotes: '',
    pestType: [], pestDuration: '', pestScope: '', pestSafety: [], pestPrevious: '', pestNotes: '',
    lockSituation: '', lockPersonInside: '', lockDoorType: '', lockType: '', lockCount: '', lockNotes: '',
    gasSmell: '', gasDevice: '', gasIssue: [], gasVentilation: '', gasNotes: '',
    drainLocation: [], drainSeverity: '', drainType: '', drainPrevious: '', drainNotes: '',
    drainScope: '', drainFloor: '', drainPreviousCleaning: [], drainAge: '',
    wcSymptom: [], wcTankType: '', wcAge: '',
    acBrand: '', acAge: '', acIssue: [], acType: '', acNotes: '',
    hpBrand: '', hpAge: '', hpIssue: [], hpErrorCode: '', hpNotes: '',
    spCount: '', spAge: '', spIssue: [], spInverterBrand: '', spNotes: '',
    problemCause: '', repairScope: '', doorType: '', lockCylinderType: '', mechanicalDamage: '',
    date1: '', time1: '', date2: '', time2: '', date3: '', time3: '', scheduleNote: '', consent: false,
  })

  // Field updaters
  const set = useCallback((field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'email') onEmailChange(value as string)
  }, [onEmailChange])

  const toggleArray = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => {
      const arr = (prev[field] as string[]) || []
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }, [])

  // ── Validation ─────────────────────────────────────────────────
  const validate = (step: number): boolean => {
    const errs: string[] = []
    if (step === 1) {
      // Contact fields
      if (!form.clientType) errs.push(t.diagClientTypeRequired)
      if (!form.clientName.trim()) errs.push(t.diagNameRequired)
      if (!form.street.trim()) errs.push(t.diagStreetRequired)
      if (!form.city.trim()) errs.push(t.diagCityRequired)
      if (!form.zip.trim()) errs.push(t.diagZipRequired)
      if (!form.phone.trim()) errs.push(t.diagPhoneRequired)
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push(t.diagEmailInvalid)
      if (!form.propertyType) errs.push(t.diagPropertyRequired)
      // Fault fields (merged into step 1)
      if (!form.faultType) errs.push(t.diagFaultRequired)
      if (!form.problemDesc.trim()) errs.push(t.diagProblemRequired)
    } else if (step === 3) {
      if (!job.scheduled_date && !form.date1) errs.push(t.diagDateRequired)
      if (!form.consent) errs.push(t.diagConsentRequired)
    }
    setErrors(errs)
    return errs.length === 0
  }

  // ── Navigation ─────────────────────────────────────────────────
  const goTo = (step: number) => {
    if (step > formStep) {
      if (!validate(formStep)) return
    }
    setErrors([])
    setFormStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Photo handling ─────────────────────────────────────────────
  const handlePhotoFiles = async (files: FileList) => {
    if (!files || files.length === 0) return
    setPhotoLoading(true)
    const validFiles = Array.from(files)
      .filter(f => f.size <= 10 * 1024 * 1024)
      .filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name))
      .slice(0, 5)
    for (const file of validFiles) {
      try {
        const data = await compressImage(file)
        setPhotos(prev => {
          if (prev.length >= 5) return prev
          return [...prev, { name: file.name, data }]
        })
      } catch (err) {
        console.error('[Photo] compression failed:', err)
      }
    }
    setPhotoLoading(false)
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate(3)) return
    setSubmitting(true)

    const payload = {
      submitted_at: new Date().toISOString(),
      form_version: '4.0',
      job_id: String(job.id),
      insurance_company: job.insurance || '',
      case_number: job.reference_number || '',
      // CRM category — exact value for CRM SPECIALIZATION field
      crm_category: resolveCrmCategory(form),
      client_type: form.clientType,
      client_name: form.clientName,
      street: form.street,
      city: form.city,
      zip: form.zip,
      floor: form.floor,
      address_note: form.addressNote,
      phone: form.phone,
      email: form.email,
      property_type: form.propertyType,
      full_address: `${form.street}, ${form.zip} ${form.city}`.trim(),
      fault_type: form.faultType,
      problem_desc: form.problemDesc,
      urgency: form.urgency,
      // ── Diagnostics: plumbing ──
      plumb_issue: form.plumbIssue, plumb_location: form.plumbLocation, plumb_water_shutoff: form.plumbWaterShutoff,
      plumb_severity: form.plumbSeverity, plumb_pipe_material: form.plumbPipeMaterial, plumb_electric_risk: form.plumbElectricRisk,
      plumb_faucet_type: form.plumbFaucetType, plumb_faucet_location: form.plumbFaucetLocation, plumb_faucet_brand: form.plumbFaucetBrand, plumb_faucet_symptom: form.plumbFaucetSymptom,
      plumb_notes: form.plumbNotes,
      // ── Diagnostics: electrical ──
      elec_issue: form.elecIssue, elec_scope: form.elecScope, elec_breaker: form.elecBreaker,
      elec_burn: form.elecBurn, elec_age: form.elecAge, elec_notes: form.elecNotes,
      // ── Diagnostics: boiler ──
      boiler_brand: form.boilerBrand, boiler_model: form.boilerModel, boiler_fuel: form.boilerFuel,
      boiler_age: form.boilerAge, boiler_issue: form.boilerIssue, boiler_error_code: form.boilerErrorCode,
      boiler_pressure: form.boilerPressure, boiler_gas_smell: form.boilerGasSmell, boiler_last_service: form.boilerLastService,
      boiler_location: form.boilerLocation, boiler_notes: form.boilerNotes,
      // ── Diagnostics: heating (radiators) ──
      heat_system: form.heatSystem, heat_issue: form.heatIssue, heat_radiator_count: form.heatRadiatorCount,
      heat_floor_type: form.heatFloorType, heat_age: form.heatAge, heat_notes: form.heatNotes,
      // ── Diagnostics: appliance ──
      appliance_type: form.applianceType, appliance_brand: form.applianceBrand, appliance_age: form.applianceAge,
      appliance_install: form.applianceInstall, appliance_issue: form.applianceIssue, appliance_error: form.applianceError, appliance_notes: form.applianceNotes,
      // ── Diagnostics: pest control ──
      pest_type: form.pestType, pest_duration: form.pestDuration, pest_scope: form.pestScope,
      pest_safety: form.pestSafety, pest_previous: form.pestPrevious, pest_notes: form.pestNotes,
      // ── Diagnostics: locksmith ──
      lock_situation: form.lockSituation, lock_person_inside: form.lockPersonInside, lock_door_type: form.lockDoorType,
      lock_type: form.lockType, lock_count: form.lockCount, lock_notes: form.lockNotes,
      // ── Diagnostics: gas ──
      gas_smell: form.gasSmell, gas_device: form.gasDevice, gas_issue: form.gasIssue,
      gas_ventilation: form.gasVentilation, gas_notes: form.gasNotes,
      // ── Diagnostics: drain/unblocking ──
      drain_location: form.drainLocation, drain_severity: form.drainSeverity, drain_type: form.drainType,
      drain_previous: form.drainPrevious, drain_notes: form.drainNotes,
      drain_scope: form.drainScope, drain_floor: form.drainFloor,
      drain_previous_cleaning: form.drainPreviousCleaning, drain_age: form.drainAge,
      // ── Diagnostics: WC (sub-panel of plumbing) ──
      wc_symptom: form.wcSymptom, wc_tank_type: form.wcTankType, wc_age: form.wcAge,
      // ── Diagnostics: airconditioning ──
      ac_brand: form.acBrand, ac_age: form.acAge, ac_issue: form.acIssue,
      ac_type: form.acType, ac_notes: form.acNotes,
      // ── Diagnostics: heat pump ──
      hp_brand: form.hpBrand, hp_age: form.hpAge, hp_issue: form.hpIssue,
      hp_error_code: form.hpErrorCode, hp_notes: form.hpNotes,
      // ── Diagnostics: solar panels ──
      sp_count: form.spCount, sp_age: form.spAge, sp_issue: form.spIssue,
      sp_inverter_brand: form.spInverterBrand, sp_notes: form.spNotes,
      // ── Appointments + photos ──
      appointments: [
        { date: form.date1, time: form.time1 },
        { date: form.date2, time: form.time2 },
        { date: form.date3, time: form.time3 },
      ].filter(a => a.date),
      schedule_note: form.scheduleNote,
      photos: photos.map(p => ({ name: p.name, data: p.data })),
      photo_count: photos.length,
    }

    try {
      // Uložit do DB — diagnostic data + fotky (base64) + synchronizace kontaktu
      const res = await fetch(`/api/portal/${token}/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      // Allow already_submitted (409) — treat as success so client sees confirmation
      if (!res.ok && res.status !== 409) {
        throw new Error(`Server error ${res.status}`)
      }
    } catch (err) {
      console.error('[Diagnostic] Submit failed:', err)
      setErrors([t.diagSubmitFailed])
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
    showToast(`${t.diagnosticSentTitle} ✅`)
    onSubmitted?.()  // notify parent → switch to waiting screen
  }

  // ── Success screen ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ marginBottom: 8 }}>{t.diagnosticSentTitle}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {t.diagnosticSentText}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
          Číslo případu: <strong>{job.reference_number}</strong>
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  // ── Helper components ──────────────────────────────────────────
  const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="field-label">
      {children}
      {required && <span style={{ color: 'var(--gold)', marginLeft: 4 }}>*</span>}
    </label>
  )

  const ErrorList = () => errors.length > 0 ? (
    <div className="portal-diag-errors">
      {errors.map((e, i) => <div key={i}>{e}</div>)}
    </div>
  ) : null

  const SafetyWarning = ({ text }: { text: string }) => (
    <div className="portal-diag-safety">
      <strong>Bezpečnostní upozornění:</strong> {text}
    </div>
  )

  const CheckboxGroup = ({ field, options }: { field: keyof FormState; options: { value: string; icon: string; label: string }[] }) => (
    <div className="portal-diag-options">
      {options.map(opt => (
        <label key={opt.value} className={`portal-diag-option${(form[field] as string[]).includes(opt.value) ? ' selected' : ''}`}>
          <input type="checkbox" checked={(form[field] as string[]).includes(opt.value)} onChange={() => toggleArray(field, opt.value)} style={{ display: 'none' }} />
          <span>{opt.icon} {opt.label}</span>
        </label>
      ))}
    </div>
  )

  const RadioGroup = ({ field, options }: { field: keyof FormState; options: { value: string; icon?: string; label: string }[] }) => (
    <div className="portal-diag-options">
      {options.map(opt => (
        <label key={opt.value} className={`portal-diag-option${form[field] === opt.value ? ' selected' : ''}`}>
          <input type="radio" checked={form[field] === opt.value} onChange={() => set(field, opt.value)} style={{ display: 'none' }} />
          <span>{opt.icon ? `${opt.icon} ` : ''}{opt.label}</span>
        </label>
      ))}
    </div>
  )

  const SelectField = ({ field, placeholder, options }: { field: keyof FormState; placeholder: string; options: { value: string; label: string }[] }) => (
    <select className="field-input" value={form[field] as string} onChange={e => set(field, e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">{t.phase1Title}</h2>

      {/* Form step progress bar */}
      <div className="portal-diag-progress">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isDone = stepNum < formStep
          const isActive = stepNum === formStep
          return (
            <div key={label} className="portal-diag-progress-row">
              {i > 0 && <div className="portal-diag-connector" />}
              <button
                type="button"
                className={`portal-diag-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                onClick={() => stepNum < formStep && goTo(stepNum)}
              >
                <span className="portal-diag-dot">{isDone ? '✓' : stepNum}</span>
                <span>{label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* ═══════════ STEP 1: ÚDAJE (Kontakt + Typ poruchy) ═══════════ */}
      {formStep === 1 && (
        <>
          {/* Card 1: Kontakt */}
          <div className="portal-card portal-card-gold portal-diag-section">
            <div className="portal-card-label">Kontakt</div>

            {/* Prefilled summary — shown when job has data and not editing */}
            {(job.customer_name || job.customer_address || job.customer_phone) && !editingContact && (
              <div className="portal-prefilled">
                <div className="portal-prefilled-head">
                  <span className="portal-prefilled-badge">Ověřeno z objednávky</span>
                  <button type="button" className="portal-prefilled-edit" onClick={() => setEditingContact(true)}>Upravit</button>
                </div>
                {job.customer_name && (
                  <div className="portal-prefilled-row">
                    <span className="portal-prefilled-k">Jméno</span>
                    <span className="portal-prefilled-v">{form.clientName}</span>
                  </div>
                )}
                {job.customer_address && (
                  <div className="portal-prefilled-row">
                    <span className="portal-prefilled-k">Adresa</span>
                    <span className="portal-prefilled-v">{form.street}, {form.city}</span>
                  </div>
                )}
                {job.customer_phone && (
                  <div className="portal-prefilled-row">
                    <span className="portal-prefilled-k">Telefon</span>
                    <span className="portal-prefilled-v">{form.phone}</span>
                  </div>
                )}
                {/* Always show non-prefilled fields: clientType, propertyType, email */}
                <div style={{ marginTop: 12 }}>
                  <div className="portal-diag-field">
                    <FieldLabel required>{t.diagClientTypeLabel}</FieldLabel>
                    <RadioGroup field="clientType" options={CLIENT_TYPE_OPTIONS} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel required>Typ nemovitosti</FieldLabel>
                    <RadioGroup field="propertyType" options={PROPERTY_OPTIONS} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>E-mail</FieldLabel>
                    <input className="field-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vas@email.cz" />
                  </div>
                </div>
              </div>
            )}

            {/* Full form — shown when no prefill OR when editing */}
            {((!job.customer_name && !job.customer_address && !job.customer_phone) || editingContact) && (
              <>
                <div className="portal-diag-field">
                  <FieldLabel required>{t.diagClientTypeLabel}</FieldLabel>
                  <RadioGroup field="clientType" options={CLIENT_TYPE_OPTIONS} />
                </div>

                <div className="portal-diag-field">
                  <FieldLabel required>Jméno a příjmení</FieldLabel>
                  <input className="field-input" type="text" value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Jan Novák" />
                </div>

                <div className="portal-diag-row">
                  <div className="portal-diag-field">
                    <FieldLabel required>Ulice a číslo</FieldLabel>
                    <input className="field-input" type="text" value={form.street} onChange={e => set('street', e.target.value)} placeholder="Školská 660/3" />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel required>Město</FieldLabel>
                    <input className="field-input" type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Praha" />
                  </div>
                </div>

                <div className="portal-diag-row">
                  <div className="portal-diag-field">
                    <FieldLabel required>PSČ</FieldLabel>
                    <input className="field-input" type="text" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="110 00" />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel required>Telefon</FieldLabel>
                    <input className="field-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+420 777 888 999" />
                  </div>
                </div>

                <div className="portal-diag-field">
                  <FieldLabel>E-mail</FieldLabel>
                  <input className="field-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vas@email.cz" />
                </div>

                <div className="portal-diag-field">
                  <FieldLabel required>Typ nemovitosti</FieldLabel>
                  <RadioGroup field="propertyType" options={PROPERTY_OPTIONS} />
                </div>
              </>
            )}

            {/* Accordion: Upřesnit adresu */}
            <div className="portal-accordion">
              <button
                type="button"
                className="portal-accordion-trigger"
                onClick={() => setShowAddressDetails(v => !v)}
              >
                Upřesnit adresu
                <span className="portal-accordion-arrow" style={{ transform: showAddressDetails ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
              </button>
              <div className={`portal-accordion-body${showAddressDetails ? ' open' : ''}`}>
                <div className="portal-diag-field">
                  <FieldLabel>Patro / číslo bytu</FieldLabel>
                  <input className="field-input" type="text" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="3. patro, byt č. 12" />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Poznámka k adrese</FieldLabel>
                  <input className="field-input" type="text" value={form.addressNote} onChange={e => set('addressNote', e.target.value)} placeholder="Např. vstup ze dvora, zvonit na Novák" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Typ poruchy */}
          <div className="portal-card portal-card-gold portal-diag-section">
            <div className="portal-card-label">Typ poruchy</div>

            <div className="portal-diag-field">
              <FieldLabel required>Oblast poruchy</FieldLabel>
              <select className="portal-form-select" value={form.faultType} onChange={e => set('faultType', e.target.value)}>
                <option value="">— Vyberte typ poruchy —</option>
                {(() => {
                  const groups = FAULT_OPTIONS.map(o => o.group).filter((g, i, a) => g && a.indexOf(g) === i) as string[]
                  return groups.map(group => (
                    <optgroup key={group} label={group}>
                      {FAULT_OPTIONS.filter(o => o.group === group).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))
                })()}
              </select>
              {categoryHint?.faultType && categoryHint.faultType !== 'ine' && (
                <div className="portal-field-hint">Předvyplněno z objednávky. Můžete změnit.</div>
              )}
            </div>

            <div className="portal-diag-field">
              <FieldLabel required>Stručný popis problému</FieldLabel>
              <textarea className="field-input" rows={3} value={form.problemDesc} onChange={e => set('problemDesc', e.target.value)} placeholder="Popište co nejpřesněji, co se stalo..." style={{ resize: 'vertical' }} />
            </div>

            <div className="portal-diag-field">
              <FieldLabel>Naléhavost</FieldLabel>
              <div className="portal-urgency-row">
                {URGENCY_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    className={`portal-urgency-chip ${opt.value === 'kritická' ? 'critical' : opt.value === 'vysoká' ? 'high' : opt.value === 'střední' ? 'medium' : 'low'}${form.urgency === opt.value ? ' selected' : ''}`}
                    onClick={() => set('urgency', opt.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    {opt.label.replace(/🔴|🟠|🟡|🟢/g, '').trim()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="portal-diag-nav" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-gold" onClick={() => goTo(2)}>Pokračovat</button>
          </div>
          <ErrorList />
        </>
      )}

      {/* ═══════════ STEP 2: DIAGNOSTIKA ═══════════ */}
      {formStep === 2 && (
        <>
          {/* 3A: Vodoinstalace */}
          {form.faultType === 'vodoinstalater' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Vodoinstalace</h3>
              </div>
              <SafetyWarning text="Pokud aktivně uniká voda, uzavřete hlavní přívod vody a vypněte elektrické spotřebiče v blízkosti úniku." />
              <div className="portal-diag-field">
                <FieldLabel required>Typ problému</FieldLabel>
                <CheckboxGroup field="plumbIssue" options={[
                  { value: 'únik vody', icon: '💧', label: 'Únik vody' },
                  { value: 'baterie', icon: '🚰', label: 'Vodovodní baterie' },
                  { value: 'ucpaný odpad', icon: '🚿', label: 'Ucpaný odpad/odtok' },
                  { value: 'prasklé potrubí', icon: '💥', label: 'Prasklé potrubí' },
                  { value: 'WC', icon: '🚽', label: 'WC (neplní/netěsní)' },
                  { value: 'bojler', icon: '🔥', label: 'Bojler (teče/nefunguje)' },
                  { value: 'zamrzlé potrubí', icon: '🧊', label: 'Zamrzlé potrubí' },
                  { value: 'nefunkční ventil', icon: '🔩', label: 'Nefunkční ventil/kohout' },
                  { value: 'jiné', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Kde se problém nachází?</FieldLabel>
                <CheckboxGroup field="plumbLocation" options={[
                  { value: 'koupelna', icon: '🚿', label: 'Koupelna' },
                  { value: 'kuchyně', icon: '🍳', label: 'Kuchyně' },
                  { value: 'WC', icon: '🚽', label: 'WC' },
                  { value: 'sklep', icon: '📦', label: 'Sklep' },
                  { value: 'venku', icon: '🏡', label: 'Venkovní rozvod' },
                  { value: 'jiné', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              {form.plumbIssue.some(i => ['únik vody', 'prasklé potrubí', 'zamrzlé potrubí', 'nefunkční ventil', 'bojler'].includes(i)) && (
                <div className="portal-diag-row">
                  <div className="portal-diag-field">
                    <FieldLabel required>Uzavřeli jste hlavní přívod vody?</FieldLabel>
                    <SelectField field="plumbWaterShutoff" placeholder="— Vyberte —" options={[
                      { value: 'ano', label: 'Ano, je uzavřený' },
                      { value: 'ne', label: 'Ne, nedaří se najít/uzavřít' },
                      { value: 'nevím', label: 'Nevím, kde je hlavní uzávěr' },
                    ]} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Závažnost úniku</FieldLabel>
                    <SelectField field="plumbSeverity" placeholder="— Vyberte —" options={[
                      { value: 'kapání', label: 'Kapání / drobný únik' },
                      { value: 'proud', label: 'Proudění vody' },
                      { value: 'záplava', label: 'Záplava / vytopení' },
                      { value: 'žádný únik', label: 'Bez viditelného úniku' },
                    ]} />
                  </div>
                </div>
              )}
              {/* plumbElectricRisk removed — not relevant for client diagnostic */}
              {/* Conditional: WC sub-panel — shown when 'WC' is selected */}
              {form.plumbIssue.includes('WC') && (
                <div style={{ background: 'var(--g1, #f9f9f9)', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid var(--g3, #e5e7eb)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark, #1f2937)', marginBottom: 12 }}>
                    🚽 Podrobnosti o WC
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Co přesně se děje?</FieldLabel>
                    <CheckboxGroup field="wcSymptom" options={[
                      { value: 'preteka_ven', icon: '💦', label: 'Přetéká voda VEN z mísy na podlahu' },
                      { value: 'preteka_dovnitr', icon: '💧', label: 'Neustále teče voda DO mísy' },
                      { value: 'nesplachuje', icon: '🔄', label: 'Nesplachuje / slabý splach' },
                      { value: 'neplni_se', icon: '🚫', label: 'Nádržka se neplní' },
                      { value: 'hluci', icon: '🔊', label: 'Hlučné / hvízdá / bublá' },
                      { value: 'zapach', icon: '👃', label: 'Zápach z odtoku' },
                    ]} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Typ splachovací nádržky</FieldLabel>
                    <RadioGroup field="wcTankType" options={[
                      { value: 'nasazena', icon: '🚽', label: 'Nasazená na míse' },
                      { value: 'zabudovana', icon: '🧱', label: 'Zabudovaná ve zdi (Geberit apod.)' },
                      { value: 'vysoko', icon: '⬆️', label: 'Vysoko na stěně' },
                      { value: 'nevim', icon: '❓', label: 'Nevím' },
                    ]} />
                  </div>
                </div>
              )}

              {/* Conditional: Faucet details — shown when 'baterie' is selected */}
              {form.plumbIssue.includes('baterie') && (
                <div style={{ background: 'var(--g1, #f9f9f9)', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid var(--g3, #e5e7eb)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark, #1f2937)', marginBottom: 12 }}>
                    🚰 Podrobnosti o baterii
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Typ baterie</FieldLabel>
                    <RadioGroup field="plumbFaucetType" options={[
                      { value: 'pákový', icon: '🔧', label: 'Páková (jednopáková)' },
                      { value: 'dvouventilový', icon: '🔩', label: 'Dvouventilová (dva kohoutky)' },
                      { value: 'termostatický', icon: '🌡️', label: 'Termostatická' },
                      { value: 'sprchový', icon: '🚿', label: 'Sprchová baterie' },
                      { value: 'nevím', icon: '❓', label: 'Nevím' },
                    ]} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Kde se baterie nachází?</FieldLabel>
                    <RadioGroup field="plumbFaucetLocation" options={[
                      { value: 'kuchyňský dřez', icon: '🍳', label: 'Kuchyňský dřez' },
                      { value: 'umyvadlo', icon: '🪥', label: 'Umyvadlo (koupelna)' },
                      { value: 'vana', icon: '🛁', label: 'Vana' },
                      { value: 'sprchový kout', icon: '🚿', label: 'Sprchový kout' },
                      { value: 'jiné', icon: '❓', label: 'Jiné' },
                    ]} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Co přesně se děje?</FieldLabel>
                    <CheckboxGroup field="plumbFaucetSymptom" options={[
                      { value: 'kapajici', icon: '💧', label: 'Kapá při zavření' },
                      { value: 'teci_pod_baterii', icon: '💦', label: 'Teče pod baterií / kolem' },
                      { value: 'slaby_proud', icon: '〰️', label: 'Slabý proud vody' },
                      { value: 'stuhla', icon: '🔒', label: 'Stuhá / nejde ovládat' },
                      { value: 'neteče_teplá', icon: '🥶', label: 'Neteče teplá voda' },
                      { value: 'neteče_studená', icon: '🧊', label: 'Neteče studená voda' },
                      { value: 'chci_výměnu', icon: '🔄', label: 'Chci celou vyměnit' },
                    ]} />
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Značka baterie (pokud víte)</FieldLabel>
                    <select
                      className="portal-form-select"
                      value={form.plumbFaucetBrand}
                      onChange={e => setForm(f => ({ ...f, plumbFaucetBrand: e.target.value }))}
                    >
                      <option value="">— nevím / neuvedeno —</option>
                      <option value="Grohe">Grohe</option>
                      <option value="Hansgrohe">Hansgrohe</option>
                      <option value="Hansa">Hansa</option>
                      <option value="Ideal Standard">Ideal Standard</option>
                      <option value="Ravak">Ravak</option>
                      <option value="Laufen">Laufen</option>
                      <option value="Novaservis">Novaservis</option>
                      <option value="Sapho">Sapho</option>
                      <option value="Oras">Oras</option>
                      <option value="Roca">Roca</option>
                      <option value="jiná">Jiná značka</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic' }}>
                    💡 Tip: Vyfotografujte typový štítek baterie (bývá pod pákou nebo na spodní straně). Pomůže technikovi přivézt správný díl.
                  </div>
                </div>
              )}

              <div className="portal-diag-field">
                <FieldLabel>Co je podle Vás potřeba?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.repairScope}
                  onChange={e => setForm(f => ({ ...f, repairScope: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  {form.plumbIssue.includes('ucpaný odpad') ? (
                    <>
                      <option value="procistiteni">Pročištění odtoku</option>
                      <option value="vymena_sifonu">Výměna sifonu</option>
                      <option value="kamerova_zkouska">Kamerová zkouška potrubí</option>
                      <option value="diagnostika">Nevím, potřebuji diagnostiku</option>
                    </>
                  ) : form.plumbIssue.includes('WC') ? (
                    <>
                      <option value="oprava_splachovani">Oprava splachování</option>
                      <option value="vymena_ventilu">Výměna ventilu v nádržce</option>
                      <option value="kompletni_vymena_wc">Kompletní výměna WC</option>
                      <option value="diagnostika">Nevím, potřebuji diagnostiku</option>
                    </>
                  ) : form.plumbIssue.includes('bojler') ? (
                    <>
                      <option value="oprava_ventilu">Oprava/výměna pojistného ventilu</option>
                      <option value="oprava_bojleru">Oprava bojleru</option>
                      <option value="vymena_bojleru">Výměna bojleru</option>
                      <option value="diagnostika">Nevím, potřebuji diagnostiku</option>
                    </>
                  ) : form.plumbIssue.includes('baterie') ? (
                    <>
                      <option value="oprava_baterie">Oprava baterie (kartušový výměna)</option>
                      <option value="vymena_baterie">Kompletní výměna baterie</option>
                      <option value="diagnostika">Nevím, potřebuji diagnostiku</option>
                    </>
                  ) : (
                    <>
                      <option value="oprava_mista">Oprava jednoho místa (těsnění, spoj, ventil)</option>
                      <option value="vymena_useku">Výměna úseku potrubí</option>
                      <option value="kompletni_vymena">Kompletní výměna rozvodů / rekonstrukce</option>
                      <option value="diagnostika">Nevím, potřebuji diagnostiku</option>
                    </>
                  )}
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.plumbNotes} onChange={e => set('plumbNotes', e.target.value)} placeholder="Stáří rozvodů, předchozí opravy..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3B: Elektroinstalace */}
          {form.faultType === 'elektrikar' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Elektroinstalace</h3>
              </div>
              <SafetyWarning text="Pokud cítíte zápach spáleniny nebo vidíte jiskření — ihned vypněte odpovídající jistič a nedotýkejte se poškozených částí." />
              <div className="portal-diag-field">
                <FieldLabel required>Typ problému</FieldLabel>
                <CheckboxGroup field="elecIssue" options={[
                  { value: 'výpadek proudu', icon: '🔌', label: 'Výpadek proudu' },
                  { value: 'jiskření', icon: '⚡', label: 'Jiskření' },
                  { value: 'zápach spáleniny', icon: '🔥', label: 'Zápach spáleniny' },
                  { value: 'nefunkční zásuvky', icon: '🔳', label: 'Nefunkční zásuvky' },
                  { value: 'blikající světla', icon: '💡', label: 'Blikající světla' },
                  { value: 'vyhozený jistič', icon: '🔧', label: 'Vypadávající jistič' },
                ]} />
              </div>
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel required>Rozsah výpadku</FieldLabel>
                  <SelectField field="elecScope" placeholder="— Vyberte —" options={[
                    { value: 'jedna zásuvka', label: 'Jedna zásuvka / obvod' }, { value: 'celá místnost', label: 'Celá místnost' },
                    { value: 'celé patro', label: 'Celé patro' }, { value: 'celý byt/dům', label: 'Celý byt / dům' },
                  ]} />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Stav jističe</FieldLabel>
                  <SelectField field="elecBreaker" placeholder="— Vyberte —" options={[
                    { value: 'vypnutý', label: 'Jistič je vyhozený' }, { value: 'nelze zapnout', label: 'Jistič nelze znovu zapnout' },
                    { value: 'zapnutý', label: 'Jistič zapnutý, proud nejde' }, { value: 'nevím', label: 'Nevím, kde je jistič' },
                  ]} />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Zápach spáleniny nebo stopy po žáru?</FieldLabel>
                <RadioGroup field="elecBurn" options={[{ value: 'ano', icon: '🔴', label: 'Ano' }, { value: 'ne', icon: '✅', label: 'Ne' }]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.elecNotes} onChange={e => set('elecNotes', e.target.value)} placeholder="Co jste dělali, když problém nastal..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3C: Kotel */}
          {form.faultType === 'kotel' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Kotel</h3>
              </div>
              <SafetyWarning text="Pokud cítíte zápach plynu, ihned otevřete okna, nepoužívejte elektrické vypínače a opusťte prostor!" />
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel required>Značka kotle</FieldLabel>
                  <input className="field-input" type="text" value={form.boilerBrand} onChange={e => set('boilerBrand', e.target.value)} placeholder="Junkers, Vaillant, Baxi..." />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Model kotle</FieldLabel>
                  <input className="field-input" type="text" value={form.boilerModel} onChange={e => set('boilerModel', e.target.value)} placeholder="Panther Condens 25 KKO" />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Typ paliva</FieldLabel>
                <SelectField field="boilerFuel" placeholder="— Vyberte —" options={[
                  { value: 'plyn', label: 'Plynový' }, { value: 'elektřina', label: 'Elektrický' },
                  { value: 'tuhá paliva', label: 'Na tuhá paliva' }, { value: 'tepelné čerpadlo', label: 'Tepelné čerpadlo' }, { value: 'nevím', label: 'Nevím' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Co nefunguje?</FieldLabel>
                <CheckboxGroup field="boilerIssue" options={[
                  { value: 'žádné topení', icon: '❄️', label: 'Netopí' }, { value: 'žádná teplá voda', icon: '🚿', label: 'Neteče teplá voda' },
                  { value: 'únik vody', icon: '💧', label: 'Únik vody z kotle' }, { value: 'hluk', icon: '🔊', label: 'Neobvyklé zvuky' },
                  { value: 'chybový kód', icon: '🖥️', label: 'Chybový kód' }, { value: 'nenastartuje', icon: '🔄', label: 'Kotel nenastartuje' },
                  { value: 'nízký tlak', icon: '📉', label: 'Nízký/vysoký tlak' },
                ]} />
              </div>
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel>Chybový kód</FieldLabel>
                  <input className="field-input" type="text" value={form.boilerErrorCode} onChange={e => set('boilerErrorCode', e.target.value)} placeholder="F28, E10, EA..." />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Tlak na manometru (bar)</FieldLabel>
                  <input className="field-input" type="text" value={form.boilerPressure} onChange={e => set('boilerPressure', e.target.value)} placeholder="0.5, 1.2, 2.8" />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Cítíte zápach plynu?</FieldLabel>
                <RadioGroup field="boilerGasSmell" options={[{ value: 'ano', icon: '🔴', label: 'Ano — OPUSŤTE PROSTOR' }, { value: 'ne', icon: '✅', label: 'Ne' }]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Poslední servis</FieldLabel>
                <SelectField field="boilerLastService" placeholder="— Nevím —" options={[
                  { value: 'do 1 roku', label: 'Do 1 roku' }, { value: '1-2 roky', label: '1–2 roky' },
                  { value: 'více než 2 roky', label: 'Více než 2 roky' }, { value: 'nikdy', label: 'Nebyl servisován' },
                ]} />
              </div>
              {form.boilerLastService === 'nikdy' && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #F59E0B', fontSize: 13, color: '#92400E', marginTop: 8 }}>
                  ⚠️ Pokud zařízení nebylo pravidelně servisováno, pojišťovna může opravu klasifikovat jako zanedbanou údržbu a náklady neuhradit.
                </div>
              )}
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.boilerNotes} onChange={e => set('boilerNotes', e.target.value)} placeholder="Cokoli, co by mohlo technikovi pomoci..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3C2: Topení a radiátory */}
          {form.faultType === 'topeni' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Topení a radiátory</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Typ topného systému</FieldLabel>
                <SelectField field="heatSystem" placeholder="— Vyberte —" options={[
                  { value: 'radiatory', label: 'Radiátory (deskové, článkové)' },
                  { value: 'podlahove', label: 'Podlahové topení' },
                  { value: 'konvektory', label: 'Konvektory' },
                  { value: 'kombinace', label: 'Kombinace (radiátory + podlahové)' },
                  { value: 'nevim', label: 'Nevím' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Co nefunguje?</FieldLabel>
                <CheckboxGroup field="heatIssue" options={[
                  { value: 'netopi', icon: '❄️', label: 'Netopí vůbec' },
                  { value: 'topi_slabe', icon: '🌡️', label: 'Topí slabě / nerovnoměrně' },
                  { value: 'unik_vody', icon: '💧', label: 'Únik vody z radiátoru' },
                  { value: 'hluk', icon: '🔊', label: 'Bublání / klepání v topení' },
                  { value: 'studenych_par', icon: '🧊', label: 'Studené radiátory (jen některé)' },
                  { value: 'termostat', icon: '🎛️', label: 'Nefunkční termostat / regulace' },
                  { value: 'prasknuti', icon: '💥', label: 'Prasklý radiátor / potrubí' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Počet problémových radiátorů</FieldLabel>
                <SelectField field="heatRadiatorCount" placeholder="— Nevím —" options={[
                  { value: '1', label: '1 radiátor' },
                  { value: '2-3', label: '2–3 radiátory' },
                  { value: '4+', label: '4 a více' },
                  { value: 'vsechny', label: 'Všechny' },
                  { value: 'podlahove', label: 'Podlahové topení' },
                ]} />
              </div>
              {form.heatSystem === 'podlahove' && (
                <div className="portal-diag-field">
                  <FieldLabel>Typ podlahového topení</FieldLabel>
                  <SelectField field="heatFloorType" placeholder="— Nevím —" options={[
                    { value: 'vodní', label: 'Vodní (teplovodní)' },
                    { value: 'elektrické', label: 'Elektrické' },
                    { value: 'nevím', label: 'Nevím' },
                  ]} />
                </div>
              )}
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.heatNotes} onChange={e => set('heatNotes', e.target.value)} placeholder="Kde se problém projevuje, jak dlouho trvá..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3D: Spotřebič */}
          {form.faultType === 'spotrebic' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Elektrospotřebič</h3>
              </div>
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel required>Typ spotřebiče</FieldLabel>
                  <SelectField field="applianceType" placeholder="— Vyberte —" options={[
                    { value: 'pračka', label: 'Pračka' }, { value: 'sušička', label: 'Sušička' }, { value: 'myčka', label: 'Myčka nádobí' },
                    { value: 'lednička', label: 'Lednička / Mrazák' }, { value: 'trouba', label: 'Trouba / Sporák' }, { value: 'varná deska', label: 'Varná deska' },
                    { value: 'bojler', label: 'Elektrický bojler' }, { value: 'klimatizace', label: 'Klimatizace' }, { value: 'jiný', label: 'Jiný spotřebič' },
                  ]} />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel required>Značka a model</FieldLabel>
                  <input className="field-input" type="text" value={form.applianceBrand} onChange={e => set('applianceBrand', e.target.value)} placeholder="Bosch SMS46KI01E" />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Porucha</FieldLabel>
                <CheckboxGroup field="applianceIssue" options={[
                  { value: 'nezapne se', icon: '🔌', label: 'Nezapne se' }, { value: 'chybový kód', icon: '🖥️', label: 'Chybový kód' },
                  { value: 'únik vody', icon: '💧', label: 'Únik vody' }, { value: 'hluk', icon: '🔊', label: 'Neobvyklé zvuky' },
                  { value: 'zápach', icon: '👃', label: 'Zápach / kouř' }, { value: 'nefunguje správně', icon: '⚙️', label: 'Nefunguje správně' },
                  { value: 'praskla_varna_deska', icon: '🍳', label: 'Prasklá varná deska / sklokeramika' },
                  { value: 'osvetleni_spotrebice', icon: '💡', label: 'Nefunkční osvětlení spotřebiče' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Bylo poškození způsobeno mechanicky? (úder, pád předmětu)</FieldLabel>
                <div className="portal-radio-group">
                  {[
                    { value: 'ano', label: 'Ano' },
                    { value: 'ne', label: 'Ne' },
                    { value: 'nevim', label: 'Nevím' },
                  ].map(opt => (
                    <label key={opt.value} className="portal-radio-option">
                      <input
                        type="radio"
                        name="mechanical_damage"
                        value={opt.value}
                        checked={form.mechanicalDamage === opt.value}
                        onChange={e => setForm(f => ({ ...f, mechanicalDamage: e.target.value }))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Chybový kód</FieldLabel>
                <input className="field-input" type="text" value={form.applianceError} onChange={e => set('applianceError', e.target.value)} placeholder="E15, F21..." />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.applianceNotes} onChange={e => set('applianceNotes', e.target.value)} placeholder="Projevy poruchy, kdy problém nastal..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3E: Deratizace */}
          {form.faultType === 'deratizace' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Deratizace a dezinfekce</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>O jaký problém se jedná?</FieldLabel>
                <CheckboxGroup field="pestType" options={[
                  { value: 'myši', icon: '🐭', label: 'Myši' }, { value: 'krysy', icon: '🐀', label: 'Krysy / potkani' },
                  { value: 'švábi', icon: '🪳', label: 'Švábi' }, { value: 'mravenci', icon: '🐜', label: 'Mravenci' },
                  { value: 'štěnice', icon: '🐛', label: 'Štěnice' }, { value: 'vosy', icon: '🐝', label: 'Vosy / sršni' },
                  { value: 'plísně', icon: '🍄', label: 'Plísně' }, { value: 'jiné', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel>Jak dlouho problém trvá?</FieldLabel>
                  <SelectField field="pestDuration" placeholder="— Vyberte —" options={[
                    { value: 'dny', label: 'Několik dní' }, { value: 'týdny', label: 'Několik týdnů' }, { value: 'měsíce', label: 'Déle než měsíc' },
                  ]} />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Rozsah zasažení</FieldLabel>
                  <SelectField field="pestScope" placeholder="— Vyberte —" options={[
                    { value: 'jedna místnost', label: 'Jedna místnost' }, { value: 'více místností', label: 'Více místností' }, { value: 'celý objekt', label: 'Celý objekt' },
                  ]} />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Důležité informace pro ošetření</FieldLabel>
                <CheckboxGroup field="pestSafety" options={[
                  { value: 'malé děti', icon: '👶', label: 'Malé děti' }, { value: 'domácí zvířata', icon: '🐕', label: 'Domácí zvířata' },
                  { value: 'alergie', icon: '🤧', label: 'Alergie / astma' }, { value: 'těhotná', icon: '🤰', label: 'Těhotná osoba' },
                  { value: 'nic z uvedeného', icon: '✅', label: 'Nic z uvedeného' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Předchozí deratizace?</FieldLabel>
                <RadioGroup field="pestPrevious" options={[{ value: 'ano', label: 'Ano' }, { value: 'ne', label: 'Ne' }]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.pestNotes} onChange={e => set('pestNotes', e.target.value)} placeholder="Kde jste škůdce viděli, jaké stopy..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3F: Zámečník */}
          {form.faultType === 'zamecnik' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Klíčová služba</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Jaká je situace?</FieldLabel>
                <RadioGroup field="lockSituation" options={[
                  { value: 'zabouchnuté', icon: '🚪', label: 'Zabouchnuté dveře (klíče uvnitř)' },
                  { value: 'ztracené klíče', icon: '🔑', label: 'Ztracené / ukradené klíče' },
                  { value: 'poškozený zámek', icon: '🔧', label: 'Poškozený / zaseknutý zámek' },
                  { value: 'zlomený klíč', icon: '🗝️', label: 'Zlomený klíč v zámku' },
                  { value: 'po vloupání', icon: '🚨', label: 'Poškození po vloupání' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Je uvnitř uzamčena osoba?</FieldLabel>
                <RadioGroup field="lockPersonInside" options={[{ value: 'ano', icon: '🔴', label: 'Ano' }, { value: 'ne', label: 'Ne' }]} />
              </div>
              <div className="portal-diag-row">
                <div className="portal-diag-field">
                  <FieldLabel>Typ dveří (materiál)</FieldLabel>
                  <SelectField field="lockDoorType" placeholder="— Vyberte —" options={[
                    { value: 'dřevěné', label: 'Dřevěné' }, { value: 'kovové', label: 'Kovové / bezpečnostní' },
                    { value: 'plastové', label: 'Plastové' }, { value: 'skleněné', label: 'Skleněné' },
                  ]} />
                </div>
                <div className="portal-diag-field">
                  <FieldLabel>Typ zámku</FieldLabel>
                  <SelectField field="lockType" placeholder="— Nevím —" options={[
                    { value: 'cylindrický', label: 'Cylindrický (vložkový)' }, { value: 'zadlabávací', label: 'Zadlabávací' },
                    { value: 'bezpečnostní', label: 'Bezpečnostní / trezorový' }, { value: 'elektronický', label: 'Elektronický / kódový' },
                  ]} />
                </div>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Počet zámků</FieldLabel>
                <SelectField field="lockCount" placeholder="— Vyberte —" options={[
                  { value: '1', label: '1 zámek' }, { value: '2', label: '2 zámky' }, { value: '3+', label: '3 a více' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.lockNotes} onChange={e => set('lockNotes', e.target.value)} placeholder="Značka zámku, přístup ke dveřím, patro..." style={{ resize: 'vertical' }} />
              </div>
              {/* Accordion: additional EA coverage fields */}
              <div className="portal-accordion">
                <button
                  type="button"
                  className="portal-accordion-trigger"
                  onClick={() => setShowLockDetails(v => !v)}
                >
                  Další podrobnosti
                  <span className="portal-accordion-arrow" style={{ display: 'inline-block', transition: 'transform 0.2s', transform: showLockDetails ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </button>
                <div className="portal-accordion-body" style={{ display: showLockDetails ? 'block' : 'none' }}>
                  <div className="portal-diag-field">
                    <FieldLabel>Umístění dveří</FieldLabel>
                    <select
                      className="portal-form-select"
                      value={form.doorType}
                      onChange={e => setForm(f => ({ ...f, doorType: e.target.value }))}
                    >
                      <option value="">— vyberte —</option>
                      <option value="hlavni_vchod">Hlavní vchodové dveře do bytu/domu</option>
                      <option value="vnitrni">Vnitřní dveře (pokoj, koupelna)</option>
                      <option value="sklep_garaz">Dveře do sklepa / garáže</option>
                      <option value="jine">Jiné (trezor, kancelář)</option>
                    </select>
                  </div>
                  <div className="portal-diag-field">
                    <FieldLabel>Typ vložky</FieldLabel>
                    <select
                      className="portal-form-select"
                      value={form.lockCylinderType}
                      onChange={e => setForm(f => ({ ...f, lockCylinderType: e.target.value }))}
                    >
                      <option value="">— vyberte —</option>
                      <option value="bezny_fab">Běžný (FAB)</option>
                      <option value="bezpecnostni">Bezpečnostní vložka (Mul-T-Lock, EVVA, apod.)</option>
                      <option value="elektronicky">Elektronický / kódový</option>
                      <option value="nevim">Nevím</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3G: Plynár */}
          {form.faultType === 'plynar' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Plynové zařízení</h3>
              </div>
              <SafetyWarning text="Pokud cítíte zápach plynu, IHNED otevřete okna, nepoužívejte elektrické vypínače, nevytvářejte jiskry a opusťte prostor. Volejte 150 nebo plynárenskou pohotovost!" />
              <div className="portal-diag-field">
                <FieldLabel required>Cítíte zápach plynu?</FieldLabel>
                <RadioGroup field="gasSmell" options={[
                  { value: 'ano', icon: '🔴', label: 'Ano — OPUSŤTE PROSTOR' },
                  { value: 'ne', icon: '✅', label: 'Ne' },
                  { value: 'občas', icon: '🟡', label: 'Občas / slabý' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Typ plynového zařízení</FieldLabel>
                <SelectField field="gasDevice" placeholder="— Vyberte —" options={[
                  { value: 'sporák', label: 'Plynový sporák / varná deska' },
                  { value: 'kotel', label: 'Plynový kotel' },
                  { value: 'karma', label: 'Plynová karma / průtokový ohřívač' },
                  { value: 'rozvod', label: 'Plynový rozvod / potrubí' },
                  { value: 'jiné', label: 'Jiné plynové zařízení' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Problém</FieldLabel>
                <CheckboxGroup field="gasIssue" options={[
                  { value: 'únik plynu', icon: '💨', label: 'Zápach / únik plynu' },
                  { value: 'nefunkční', icon: '🔧', label: 'Zařízení nefunguje' },
                  { value: 'revize', icon: '📋', label: 'Potřeba revize' },
                  { value: 'špatný plamen', icon: '🔥', label: 'Špatný plamen (žlutý/nestabilní)' },
                  { value: 'jiné', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Je zajištěno větrání?</FieldLabel>
                <RadioGroup field="gasVentilation" options={[
                  { value: 'ano', icon: '✅', label: 'Ano, okna otevřená' },
                  { value: 'ne', icon: '🔴', label: 'Ne' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.gasNotes} onChange={e => set('gasNotes', e.target.value)} placeholder="Typ zařízení, stáří, poslední revize..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3H: Ucpané odpady */}
          {form.faultType === 'odpady' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Ucpané odpady</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Kde je problém?</FieldLabel>
                <CheckboxGroup field="drainLocation" options={[
                  { value: 'WC', icon: '🚽', label: 'WC / toaleta' },
                  { value: 'kuchyňský dřez', icon: '🍳', label: 'Kuchyňský dřez' },
                  { value: 'sprcha/vana', icon: '🚿', label: 'Sprchový kout / vana' },
                  { value: 'umyvadlo', icon: '🪥', label: 'Umyvadlo' },
                  { value: 'kanalizace', icon: '🏗️', label: 'Hlavní kanalizace / stoupačka' },
                  { value: 'jiné', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Závažnost</FieldLabel>
                <SelectField field="drainSeverity" placeholder="— Vyberte —" options={[
                  { value: 'pomalý odtok', label: 'Pomalý odtok' },
                  { value: 'neodtéká', label: 'Voda vůbec neodtéká' },
                  { value: 'vrací se', label: 'Voda se vrací zpět' },
                  { value: 'zapáchá', label: 'Silný zápach z odtoku' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Rozsah ucpání</FieldLabel>
                <RadioGroup field="drainScope" options={[
                  { value: 'jedna_vetev', icon: '1️⃣', label: 'Ucpaná jen jedna větev / jedno místo' },
                  { value: 'vice_vetvi', icon: '🔀', label: 'Neodtéká na více místech' },
                  { value: 'kompletni', icon: '🏠', label: 'Neodtéká žádný odpad v celém bytě / domě' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Na kterém podlaží?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.drainFloor}
                  onChange={e => setForm(f => ({ ...f, drainFloor: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="prizemi">Přízemí</option>
                  <option value="1_patro">1. patro</option>
                  <option value="2_patro">2. patro</option>
                  <option value="3_patro_a_vyse">3. patro a výše</option>
                  <option value="suteren">Suterén / sklep</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Zkoušeli jste nějaké čištění?</FieldLabel>
                <CheckboxGroup field="drainPreviousCleaning" options={[
                  { value: 'rucne', icon: '🪠', label: 'Ruční čištění (zvon / gumový)' },
                  { value: 'chemicke', icon: '🧪', label: 'Chemický čistič' },
                  { value: 'spirala', icon: '🔩', label: 'Čistící spirála' },
                  { value: 'nic', icon: '🚫', label: 'Nic, nechci poškodit' },
                  { value: 'jine', icon: '❓', label: 'Jiné' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Stáří odpadního potrubí</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.drainAge}
                  onChange={e => setForm(f => ({ ...f, drainAge: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="do_10">Do 10 let</option>
                  <option value="10_30">10–30 let</option>
                  <option value="nad_30">Nad 30 let</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.drainNotes} onChange={e => set('drainNotes', e.target.value)} placeholder="Jak dlouho problém trvá, co ucpání způsobilo..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3I: Klimatizace */}
          {form.faultType === 'klimatizace' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Klimatizace</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Značka</FieldLabel>
                <input className="field-input" type="text" value={form.acBrand} onChange={e => set('acBrand', e.target.value)} placeholder="Daikin, Mitsubishi, Samsung..." />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Problém</FieldLabel>
                <CheckboxGroup field="acIssue" options={[
                  { value: 'nechladí', icon: '🌡️', label: 'Nechladí / netopí' },
                  { value: 'únik vody', icon: '💧', label: 'Únik vody / kondenzátu' },
                  { value: 'hluk', icon: '🔊', label: 'Neobvyklý hluk' },
                  { value: 'zápach', icon: '👃', label: 'Zápach' },
                  { value: 'chybový kód', icon: '🖥️', label: 'Chybový kód' },
                  { value: 'nezapne', icon: '🔌', label: 'Nezapne se' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.acNotes} onChange={e => set('acNotes', e.target.value)} placeholder="Kdy nastal problém, chybový kód..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3J: Tepelné čerpadlo */}
          {form.faultType === 'tepelne_cerpadlo' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Tepelné čerpadlo</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Značka</FieldLabel>
                <input className="field-input" type="text" value={form.hpBrand} onChange={e => set('hpBrand', e.target.value)} placeholder="Daikin, Viessmann, Nibe..." />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Problém</FieldLabel>
                <CheckboxGroup field="hpIssue" options={[
                  { value: 'netopí', icon: '❄️', label: 'Netopí / nechladí' },
                  { value: 'hluk', icon: '🔊', label: 'Neobvyklý hluk' },
                  { value: 'chybový kód', icon: '🖥️', label: 'Chybový kód' },
                  { value: 'únik chladiva', icon: '💨', label: 'Podezření na únik chladiva' },
                  { value: 'zamrzá', icon: '🧊', label: 'Venkovní jednotka zamrzá' },
                  { value: 'teplá voda', icon: '🚿', label: 'Problém s teplou vodou' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Chybový kód</FieldLabel>
                <input className="field-input" type="text" value={form.hpErrorCode} onChange={e => set('hpErrorCode', e.target.value)} placeholder="E01, F12, H71..." />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.hpNotes} onChange={e => set('hpNotes', e.target.value)} placeholder="Typ čerpadla (vzduch-voda, země-voda), instalace..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3K: Solární panely */}
          {form.faultType === 'solarni_panely' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Solární panely</h3>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Počet panelů</FieldLabel>
                <SelectField field="spCount" placeholder="— Nevím —" options={[
                  { value: '1-5', label: '1–5' }, { value: '6-15', label: '6–15' },
                  { value: '16-30', label: '16–30' }, { value: 'nad 30', label: 'Nad 30' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Problém</FieldLabel>
                <CheckboxGroup field="spIssue" options={[
                  { value: 'nízký výkon', icon: '📉', label: 'Nízký výkon / nulová produkce' },
                  { value: 'chyba střídače', icon: '🖥️', label: 'Chybový kód střídače' },
                  { value: 'poškozený panel', icon: '💥', label: 'Fyzické poškození panelu' },
                  { value: 'únik', icon: '💧', label: 'Zatékání u panelů' },
                  { value: 'monitoring', icon: '📡', label: 'Nefunguje monitoring / aplikace' },
                ]} />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Značka střídače (invertoru)</FieldLabel>
                <input className="field-input" type="text" value={form.spInverterBrand} onChange={e => set('spInverterBrand', e.target.value)} placeholder="Fronius, SolarEdge, Huawei..." />
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Jak problém vznikl?</FieldLabel>
                <select
                  className="portal-form-select"
                  value={form.problemCause}
                  onChange={e => setForm(f => ({ ...f, problemCause: e.target.value }))}
                >
                  <option value="">— vyberte —</option>
                  <option value="nahle">Náhle / havárie (samo se to porouchalo)</option>
                  <option value="postupne">Postupně se zhoršovalo</option>
                  <option value="po_zasahu">Po zásahu jiné firmy / po rekonstrukci</option>
                  <option value="vlastni_pokus">Vlastní pokus o opravu</option>
                  <option value="nevim">Nevím</option>
                </select>
              </div>
              <div className="portal-diag-field">
                <FieldLabel>Doplňující informace</FieldLabel>
                <textarea className="field-input" rows={2} value={form.spNotes} onChange={e => set('spNotes', e.target.value)} placeholder="Typ panelů, typ systému (fotovoltaika / termální)..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 3L: Iné / ostatné práce */}
          {form.faultType === 'ine' && (
            <div className="portal-card portal-diag-section">
              <div className="portal-diag-section-title">
                <h3>Diagnostika — Ostatní práce</h3>
              </div>
              <div className="portal-diag-info">
                Popište prosím co nejpřesněji, jaké práce jsou potřeba.
                Technik se s Vámi spojí pro upřesnění detailů.
              </div>
              <div className="portal-diag-field">
                <FieldLabel required>Popis požadovaných prací</FieldLabel>
                <textarea
                  className="field-input"
                  rows={4}
                  value={form.problemDesc}
                  onChange={e => set('problemDesc', e.target.value)}
                  placeholder="Popište co je potřeba opravit, vyměnit nebo zkontrolovat..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* No fault type selected message */}
          {!form.faultType && (
            <div className="portal-card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              Vraťte se na krok 1 a vyberte typ poruchy.
            </div>
          )}

          {/* Step 2 navigation */}
          <div className="portal-diag-nav">
            <button type="button" className="btn btn-outline" onClick={() => goTo(1)}>Zpět</button>
            <button type="button" className="btn btn-gold" onClick={() => goTo(3)}>Pokračovat</button>
          </div>
          <ErrorList />
        </>
      )}

      {/* ═══════════ STEP 3: TERMÍN + FOTKY ═══════════ */}
      {formStep === 3 && (
        <>
          {/* Photos — structured slots */}
          <div className="portal-card portal-diag-section">
            <div className="portal-diag-section-title">
              <h3>Fotodokumentace</h3>
            </div>
            <div className="portal-diag-info">
              Přiložte fotografie — pomohou technikovi přijít připraven. Vyplňte alespoň první slot.
            </div>

            {/* 4 named photo slots */}
            {[
              { label: 'Foto problému', hint: 'Celkový pohled na závadu' },
              { label: 'Detail závady', hint: 'Zblízka — kde přesně teče, praská, nefunguje' },
              { label: 'Typový štítek', hint: 'Výrobce, model, sériové číslo (štítek na spotřebiči/kotli)' },
              { label: 'Okolí a přístup', hint: 'Prostor kolem — jak se k závadě dostat' },
            ].map((slot, slotIdx) => {
              const slotPhoto = photos[slotIdx] || null
              return (
                <div key={slotIdx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: slotIdx < 3 ? '1px solid var(--g2, #eee)' : 'none',
                }}>
                  {/* Slot label */}
                  <div style={{ minWidth: 90, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dark, #1f2937)', marginTop: 2 }}>{slot.label}</div>
                  </div>

                  {/* Photo preview or upload button */}
                  {slotPhoto ? (
                    <div style={{ position: 'relative', flex: 1 }}>
                      <img
                        src={slotPhoto.data}
                        alt={slot.label}
                        style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--g3, #ddd)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(slotIdx)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        id={`photo-slot-${slotIdx}`}
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          if (!e.target.files?.length) return
                          const file = e.target.files[0]
                          const fileName = file.name
                          setPhotoLoading(true)
                          try {
                            const data = await compressImage(file)
                            setPhotos(prev => {
                              const next = [...prev]
                              while (next.length <= slotIdx) next.push({ name: '', data: '' })
                              next[slotIdx] = { name: fileName, data }
                              return next.filter(p => p.data)
                            })
                          } catch (err) {
                            console.error('[Photo] compression failed:', err)
                          }
                          setPhotoLoading(false)
                          e.target.value = ''
                        }}
                      />
                      <label
                        htmlFor={`photo-slot-${slotIdx}`}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '16px 12px', borderRadius: 8,
                          border: '2px dashed var(--g3, #ddd)', cursor: 'pointer',
                          background: 'var(--g1, #f9f9f9)', textAlign: 'center',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{slot.hint}</span>
                      </label>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Extra photo slot — generic, for anything else */}
            {photos.length < 5 && photos.length >= 1 && (
              <div style={{ marginTop: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files) handlePhotoFiles(e.target.files)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                />
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ fontSize: 13, padding: '8px 16px', width: '100%' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Přidat další fotografie ({photos.length}/5)
                </button>
              </div>
            )}

            {photoLoading && (
              <p style={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 600, margin: '12px 0' }}>Zpracovávám fotografii...</p>
            )}

            {/* Extra photos beyond the 4 slots — show as thumbnails */}
            {photos.length > 4 && (
              <div className="portal-diag-photo-previews" style={{ marginTop: 8 }}>
                {photos.slice(4).map((p, i) => (
                  <div key={i + 4} className="portal-diag-photo-preview">
                    <img src={p.data} alt={p.name} />
                    <button type="button" className="portal-diag-photo-remove" onClick={() => removePhoto(i + 4)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="portal-card portal-diag-section">
            <div className="portal-diag-section-title">
              <h3>{job.scheduled_date ? 'Dohodnutý termín' : 'Preferované termíny'}</h3>
            </div>

            {job.scheduled_date ? (
              /* Confirmed schedule — show agreed date instead of picker */
              <div style={{ padding: '16px 0' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px', background: 'var(--success-bg, #f0fdf4)', borderRadius: 12,
                  border: '1px solid var(--success-border, #bbf7d0)'
                }}>
                  <span style={{ fontSize: 28 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--dark)', marginBottom: 4 }}>
                      {(() => {
                        try {
                          const d = new Date(job.scheduled_date + 'T00:00:00')
                          return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                        } catch { return job.scheduled_date }
                      })()}
                      {job.scheduled_time && (
                        <span style={{ fontWeight: 500, marginLeft: 8 }}>
                          {job.scheduled_time.replace(/\s*[-]\s*/, ' – ')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--g4)' }}>
                      Termín byl dohodnut s technikem. Není potřeba jej měnit.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No confirmed schedule — show date picker */
              <>
                <div className="portal-diag-info">
                  Uveďte alespoň 1 termín, kdy jste k zastižení. Technik si vybere z termínů a zvolený termín se Vám zobrazí v této aplikaci.
                </div>

                {/* Slot 1 — always visible */}
                <div className="portal-date-slot">
                  <div className="portal-date-slot-label">1. termín *</div>
                  <div>
                    <label className="field-label">Datum *</label>
                    <input className="field-input" type="date" min={today} value={form.date1} onChange={e => set('date1', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Čas</label>
                    <select className="field-input" value={form.time1} onChange={e => set('time1', e.target.value)}>
                      <option value="">— Vyberte —</option>
                      {TIME_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Slot 2 — shown when visibleSlots >= 2 */}
                {visibleSlots >= 2 && (
                  <div className="portal-date-slot">
                    <div className="portal-date-slot-label">2. termín (nepovinné)</div>
                    <div>
                      <label className="field-label">Datum</label>
                      <input className="field-input" type="date" min={today} value={form.date2} onChange={e => set('date2', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Čas</label>
                      <select className="field-input" value={form.time2} onChange={e => set('time2', e.target.value)}>
                        <option value="">— Vyberte —</option>
                        {TIME_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Slot 3 — shown when visibleSlots >= 3 */}
                {visibleSlots >= 3 && (
                  <div className="portal-date-slot">
                    <div className="portal-date-slot-label">3. termín (nepovinné)</div>
                    <div>
                      <label className="field-label">Datum</label>
                      <input className="field-input" type="date" min={today} value={form.date3} onChange={e => set('date3', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Čas</label>
                      <select className="field-input" value={form.time3} onChange={e => set('time3', e.target.value)}>
                        <option value="">— Vyberte —</option>
                        {TIME_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Add slot button — shown when visibleSlots < 3 */}
                {visibleSlots < 3 && (
                  <button
                    type="button"
                    className="portal-add-slot-btn"
                    onClick={() => setVisibleSlots(v => v + 1)}
                  >
                    + Přidat další termín
                  </button>
                )}

                <div className="portal-diag-field">
                  <FieldLabel>Poznámka k termínům</FieldLabel>
                  <textarea className="field-input" rows={2} value={form.scheduleNote} onChange={e => set('scheduleNote', e.target.value)} placeholder="Např. preferuji dopoledne, volat předem..." style={{ resize: 'vertical' }} />
                </div>
              </>
            )}
          </div>

          {/* Consent + Submit */}
          <div className="portal-card portal-diag-section">
            <label className="portal-diag-consent">
              <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} />
              <span>Souhlasím se zpracováním osobních údajů za účelem realizace opravy. Vaše data jsou chráněna a zpracovávána výhradně pro uvedený účel.</span>
            </label>
          </div>

          <div className="portal-diag-nav">
            <button type="button" className="btn btn-outline" onClick={() => goTo(2)}>Zpět</button>
            <button
              type="button"
              className="btn btn-gold btn-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? t.submitting : t.diagSubmitBtn}
            </button>
          </div>
          <ErrorList />
        </>
      )}
    </div>
  )
}
