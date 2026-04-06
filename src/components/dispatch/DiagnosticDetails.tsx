'use client'

/**
 * DiagnosticDetails — renders full diagnostic form data for a job.
 *
 * Used in both MarketplaceJobCard (before acceptance) and
 * ExpandableJobCard (after acceptance, without appointment slots).
 */

import type { DiagData } from '@/types/diagnostic'

// ── Label maps ──────────────────────────────────────────────────────────────

export const FAULT_LABELS: Record<string, string> = {
  vodoinstalater:   '🔧 Vodoinstalace',
  elektrikar:       '⚡ Elektroinstalace',
  kotel:            '🔥 Kotel',
  topeni:           '🌡️ Topení a radiátory',
  plynar:           '💨 Plynové zařízení',
  zamecnik:         '🔑 Klíčová služba',
  odpady:           '🚿 Ucpané odpady',
  spotrebic:        '🧊 Elektrospotřebič',
  klimatizace:      '❄️ Klimatizace',
  tepelne_cerpadlo: '🌡️ Tepelné čerpadlo',
  solarni_panely:   '☀️ Solární panely',
  deratizace:       '🐀 Deratizace',
  ine:              '🔩 Ostatní práce',
}

export const URGENCY_LABELS: Record<string, { sk: string; cz: string }> = {
  'kritická': { sk: '🔴 Kritická — aktívna havária', cz: '🔴 Kritická — aktivní havárie' },
  'vysoká':   { sk: '🟠 Vysoká — nefunkčná základná služba', cz: '🟠 Vysoká — nefunkční základní služba' },
  'střední':  { sk: '🟡 Stredná — problém s obmedzením', cz: '🟡 Střední — problém s omezením' },
  'nízká':    { sk: '🟢 Nízka — plánovaná oprava', cz: '🟢 Nízká — plánovaná oprava' },
}

export const PROPERTY_LABELS: Record<string, string> = {
  byt:               '🏢 Byt',
  dum:               '🏠 Rodinný dům',
  komercni:          '🏗️ Komerční objekt',
  spolecne_prostory: '🏢 Společné prostory',
  rd:                '🏠 Rodinný dům',
  RD:                '🏠 Rodinný dům',
  family_house:      '🏠 Rodinný dům',
  house:             '🏠 Rodinný dům',
  dom:               '🏠 Rodinný dům',
  apartment:         '🏢 Byt',
  flat:              '🏢 Byt',
  commercial:        '🏗️ Komerční objekt',
  office:            '🏢 Kancelář',
  kancelář:          '🏢 Kancelář',
  kancelar:          '🏢 Kancelář',
  panerak:           '🏢 Panelák',
  panelak:           '🏢 Panelák',
}

/** Case-insensitive lookup for property type labels */
export function getPropertyLabel(propertyType: string | undefined | null): string | undefined {
  if (!propertyType) return undefined
  return PROPERTY_LABELS[propertyType] || PROPERTY_LABELS[propertyType.toLowerCase()] || undefined
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | number | string[] | null }) {
  if (!value && value !== 0) return null
  if (Array.isArray(value) && value.length === 0) return null
  return (
    <div className="mkp-row">
      <span className="mkp-row-label">{label}</span>
      <span className="mkp-row-value">
        {Array.isArray(value)
          ? <span className="mkp-tags">{value.map((v, i) => <span key={i} className="mkp-tag">{v}</span>)}</span>
          : String(value)}
      </span>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mkp-section">{children}</div>
}

// ── Main component ───────────────────────────────────────────────────────────

interface DiagnosticDetailsProps {
  diag: DiagData
  /** When true, shows full detail. When false, shows only summary header + problem_desc. */
  expanded?: boolean
  lang?: 'sk' | 'cz'
}

export default function DiagnosticDetails({ diag: d, expanded = true, lang = 'sk' }: DiagnosticDetailsProps) {
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk
  const ft = d.fault_type || ''
  const hasDiag = !!(d.fault_type || d.problem_desc)

  if (!hasDiag) return null

  return (
    <div className="diag-details">
      {/* ── Summary header (always visible) ── */}
      <div className="mkp-fault-header">
        <span className="mkp-fault-label">
          {FAULT_LABELS[ft] || (ft ? `🔧 ${ft}` : tl('🔧 Neurčený typ poruchy', '🔧 Neurčený typ poruchy'))}
        </span>
        {d.urgency && (
          <span className="mkp-urgency-badge">
            {URGENCY_LABELS[d.urgency] ? (lang === 'cz' ? URGENCY_LABELS[d.urgency].cz : URGENCY_LABELS[d.urgency].sk) : d.urgency}
          </span>
        )}
      </div>

      {/* ── Problem description ── */}
      {d.problem_desc && (
        <div className="mkp-quick-summary">
          <p className="mkp-problem-text">
            {expanded
              ? d.problem_desc
              : d.problem_desc.length > 150
              ? `${d.problem_desc.slice(0, 150)}…`
              : d.problem_desc}
          </p>
          <div className="mkp-quick-row">
            {d.property_type && <span className="mkp-chip">{getPropertyLabel(d.property_type) || d.property_type}</span>}
            {d.floor && <span className="mkp-chip">{d.floor}</span>}
            {(d.photo_count ?? 0) > 0 && <span className="mkp-chip">📷 {d.photo_count} {tl('fotiek', 'fotek')}</span>}
          </div>
        </div>
      )}

      {/* ── Full detail (when expanded) ── */}
      {expanded && (
        <div className="mkp-detail">

          <Section>
            <Row label="Typ nemovitosti" value={getPropertyLabel(d.property_type) || d.property_type} />
            <Row label="Patro / byt"        value={d.floor} />
            <Row label="Poznámka k adrese"  value={d.address_note} />
          </Section>

          {ft === 'vodoinstalater' && <Section>
            <Row label="Typ problému"              value={d.plumb_issue} />
            <Row label="Umiestnenie"               value={d.plumb_location} />
            <Row label={tl("Hlavný uzáver vody", "Hlavní uzávěr vody")}        value={d.plumb_water_shutoff} />
            <Row label="Závažnosť úniku"           value={d.plumb_severity} />
            <Row label={tl("Typ batérie", "Typ baterie")}   value={d.plumb_faucet_type} />
            <Row label={tl("Umiestnenie batérie", "Umístění baterie")} value={d.plumb_faucet_location} />
            <Row label="Značka batérie"            value={d.plumb_faucet_brand} />
            <Row label={tl("Príznaky", "Příznaky")} value={d.plumb_faucet_symptom} />
            <Row label={tl("Materiál potrubia", "Materiál potrubí")}          value={d.plumb_pipe_material} />
            <Row label="Poznámky"                  value={d.plumb_notes} />
            {/* WC sub-panel */}
            <Row label="WC problém"                value={d.wc_symptom} />
            <Row label="Typ nádržky WC"            value={d.wc_tank_type} />
            <Row label="Vek WC"                    value={d.wc_age} />
          </Section>}

          {ft === 'elektrikar' && <Section>
            <Row label="Typ problému"        value={d.elec_issue} />
            <Row label="Rozsah výpadku"      value={d.elec_scope} />
            <Row label="Stav jističe"        value={d.elec_breaker} />
            <Row label={tl("Zápach / stopy žhavenia", "Zápach / stopy žáru")} value={d.elec_burn} />
            <Row label={tl("Vek inštalácie", "Stáří instalace")}    value={d.elec_age} />
            <Row label="Poznámky"            value={d.elec_notes} />
          </Section>}

          {ft === 'kotel' && <Section>
            <Row label="Značka"            value={d.boiler_brand} />
            <Row label="Model"             value={d.boiler_model} />
            <Row label="Palivo"            value={d.boiler_fuel} />
            <Row label={tl("Vek", "Stáří")}             value={d.boiler_age} />
            <Row label="Čo nefunguje"      value={d.boiler_issue} />
            <Row label="Chybový kód"       value={d.boiler_error_code} />
            <Row label="Tlak (bar)"        value={d.boiler_pressure} />
            <Row label="Zápach plynu"      value={d.boiler_gas_smell} />
            <Row label="Posledný servis"   value={d.boiler_last_service} />
            <Row label="Umiestnenie kotla" value={d.boiler_location} />
            <Row label="Poznámky"          value={d.boiler_notes} />
          </Section>}

          {ft === 'topeni' && <Section>
            <Row label="Typ systému"        value={d.heat_system} />
            <Row label="Čo nefunguje"       value={d.heat_issue} />
            <Row label="Počet radiátorov"   value={d.heat_radiator_count} />
            <Row label="Typ podlah. topení" value={d.heat_floor_type} />
            <Row label={tl("Vek", "Stáří")}              value={d.heat_age} />
            <Row label="Poznámky"           value={d.heat_notes} />
          </Section>}

          {ft === 'spotrebic' && <Section>
            <Row label="Typ spotrebiča"  value={d.appliance_type} />
            <Row label="Značka a model"  value={d.appliance_brand} />
            <Row label={tl("Vek", "Stáří")}           value={d.appliance_age} />
            <Row label="Inštalácia"      value={d.appliance_install} />
            <Row label="Porucha"         value={d.appliance_issue} />
            <Row label="Chybový kód"     value={d.appliance_error} />
            <Row label="Poznámky"        value={d.appliance_notes} />
          </Section>}

          {ft === 'deratizace' && <Section>
            <Row label="Typ problému"               value={d.pest_type} />
            <Row label="Trvanie"                    value={d.pest_duration} />
            <Row label="Rozsah"                     value={d.pest_scope} />
            <Row label="Bezp. info"                 value={d.pest_safety} />
            <Row label="Predchádzajúca deratizácia" value={d.pest_previous} />
            <Row label="Poznámky"                   value={d.pest_notes} />
          </Section>}

          {ft === 'zamecnik' && <Section>
            <Row label="Situácia"     value={d.lock_situation} />
            <Row label="Osoba vnútri" value={d.lock_person_inside} />
            <Row label="Typ dverí"    value={d.lock_door_type} />
            <Row label="Typ zámku"    value={d.lock_type} />
            <Row label="Počet zámkov" value={d.lock_count} />
            <Row label="Poznámky"     value={d.lock_notes} />
          </Section>}

          {ft === 'plynar' && <Section>
            <Row label="Zápach plynu"    value={d.gas_smell} />
            <Row label="Typ zariadenia"  value={d.gas_device} />
            <Row label="Problém"         value={d.gas_issue} />
            <Row label="Vetranie"        value={d.gas_ventilation} />
            <Row label="Poznámky"        value={d.gas_notes} />
          </Section>}

          {ft === 'odpady' && <Section>
            <Row label="Kde je problém"           value={d.drain_location} />
            <Row label="Rozsah"                   value={d.drain_scope} />
            <Row label="Poschodie"                value={d.drain_floor} />
            <Row label="Závažnosť"                value={d.drain_severity} />
            <Row label="Vek odpadu"               value={d.drain_age} />
            <Row label={tl("Predchádzajúce čistenie", "Předchozí čištění")} value={d.drain_previous_cleaning} />
            <Row label="Poznámky"                 value={d.drain_notes} />
          </Section>}

          {ft === 'klimatizace' && <Section>
            <Row label="Značka"       value={d.ac_brand} />
            <Row label={tl("Vek", "Stáří")}        value={d.ac_age} />
            <Row label="Problém"      value={d.ac_issue} />
            <Row label="Typ jednotky" value={d.ac_type} />
            <Row label="Poznámky"     value={d.ac_notes} />
          </Section>}

          {ft === 'tepelne_cerpadlo' && <Section>
            <Row label="Značka"       value={d.hp_brand} />
            <Row label={tl("Vek", "Stáří")}        value={d.hp_age} />
            <Row label="Problém"      value={d.hp_issue} />
            <Row label="Chybový kód"  value={d.hp_error_code} />
            <Row label="Poznámky"     value={d.hp_notes} />
          </Section>}

          {ft === 'solarni_panely' && <Section>
            <Row label="Počet panelov"    value={d.sp_count} />
            <Row label={tl("Vek systému", "Stáří systému")}    value={d.sp_age} />
            <Row label="Problém"          value={d.sp_issue} />
            <Row label="Značka invertora" value={d.sp_inverter_brand} />
            <Row label="Poznámky"         value={d.sp_notes} />
          </Section>}

        </div>
      )}

      {/* ── Schedule note (always visible when present) ── */}
      {d.schedule_note && (
        <div className="mkp-schedule-note">
          <span className="mkp-schedule-note-label">{tl('Poznámka k termínom:', 'Poznámka k termínům:')}</span>
          <span className="mkp-schedule-note-text">{d.schedule_note}</span>
        </div>
      )}
    </div>
  )
}
