'use client'

import SectionCollapsible from '@/components/admin/SectionCollapsible'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { SPECIALIZATIONS } from '@/lib/constants'
import type { Job, InsuranceKey } from '@/data/mockData'
import type { ApiPartner } from '@/lib/jobAdapter'

interface BasicInfoSectionProps {
  job: Job
  sectionState: Record<string, boolean>
  partners: ApiPartner[]
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  setJob: (updater: (prev: Job | null) => Job | null) => void
  handleSave: (fields: Record<string, unknown>) => void
  isSaving: boolean
  currency: string
}

export default function BasicInfoSection({
  job,
  sectionState,
  partners,
  isEditing,
  setIsEditing,
  setJob,
  handleSave,
  isSaving,
  currency,
}: BasicInfoSectionProps) {
  return (
    <SectionCollapsible
      id="sec-basic"
      icon="📋"
      title="Základné informácie"
      forceOpen={sectionState['sec-basic']}
      actions={!isEditing && (
        <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setIsEditing(true)}>
          ✏️ Upraviť
        </button>
      )}
    >
      <div className="crm-field-grid">

        {/* ── Identifikácia zákazky ── */}
        <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Identifikácia zákazky</div>

        <div className="crm-field" data-walkthrough="inline-edit-demo">
          <span className="crm-field-label">Číslo zákazky <InfoTooltip text={JOB_DETAIL_TOOLTIPS.referenceNumber} /></span>
          {isEditing ? (
            <input
              type="text"
              className="crm-field-input"
              value={job.reference_number}
              placeholder="napr. EA-2026-CZ-004851"
              onChange={e => setJob(prev => prev ? { ...prev, reference_number: e.target.value } : prev)}
            />
          ) : (
            <div className="crm-field-value">{job.reference_number || '—'}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Číslo objednávky u partnera <InfoTooltip text={JOB_DETAIL_TOOLTIPS.partnerOrderId} /></span>
          {isEditing ? (
            <input
              type="text"
              className="crm-field-input"
              value={job.partner_order_id || ''}
              placeholder="napr. 177074"
              onChange={e => setJob(prev => prev ? { ...prev, partner_order_id: e.target.value || null } : prev)}
            />
          ) : (
            <div className="crm-field-value">{job.partner_order_id || '—'}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Asistenčná spoločnosť <InfoTooltip text={JOB_DETAIL_TOOLTIPS.insuranceCompany} /></span>
          {isEditing ? (
            <select
              className="crm-field-input"
              value={job.partner_id || ''}
              onChange={e => {
                const pid = e.target.value ? parseInt(e.target.value) : null
                const partner = partners.find(p => p.id === pid)
                setJob(prev => prev ? {
                  ...prev,
                  partner_id: pid,
                  insurance: (partner?.name as InsuranceKey) || prev.insurance,
                } : prev)
              }}
            >
              <option value="">— Bez partnera —</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <div className="crm-field-value">{partners?.find(p => p.id === job.partner_id)?.name || job.insurance || '—'}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Krajina <InfoTooltip text={JOB_DETAIL_TOOLTIPS.country} /></span>
          {isEditing ? (
            <select
              className="crm-field-input"
              value={job.customer_country || ''}
              onChange={e => setJob(prev => prev ? { ...prev, customer_country: e.target.value || null } : prev)}
            >
              <option value="">—</option>
              <option value="SK">SK</option>
              <option value="CZ">CZ</option>
            </select>
          ) : (
            <div className="crm-field-value">{job.customer_country || '—'}</div>
          )}
        </div>

        {/* ── Typ zákazky ── */}
        <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Typ zákazky</div>

        <div className="crm-field">
          <span className="crm-field-label">Kategória <InfoTooltip text={JOB_DETAIL_TOOLTIPS.category} /></span>
          {isEditing ? (
            <select
              className="crm-field-input"
              value={job.category}
              onChange={e => setJob(prev => prev ? { ...prev, category: e.target.value } : prev)}
            >
              {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <div className="crm-field-value">{job.category}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Urgentnosť <InfoTooltip text={JOB_DETAIL_TOOLTIPS.urgency} /></span>
          {isEditing ? (
            <select
              className="crm-field-input"
              value={job.urgency}
              onChange={e => setJob(prev => prev ? { ...prev, urgency: e.target.value } : prev)}
            >
              <option value="normal">Normálna</option>
              <option value="urgent">Urgentná</option>
            </select>
          ) : (
            <div className="crm-field-value">{job.urgency === 'urgent' ? 'Urgentná' : 'Normálna'}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">VIP <InfoTooltip text={JOB_DETAIL_TOOLTIPS.vip} /></span>
          {isEditing ? (
            <select
              className="crm-field-input"
              value={job.custom_fields?.vip ? 'true' : 'false'}
              onChange={e => setJob(prev => prev ? ({
                ...prev,
                custom_fields: { ...prev.custom_fields, vip: e.target.value === 'true' },
              }) : prev)}
            >
              <option value="false">Nie</option>
              <option value="true">Áno</option>
            </select>
          ) : (
            <div className="crm-field-value">
              {job.custom_fields?.vip
                ? <span style={{ color: '#B8860B', fontWeight: 600 }}>⭐ Áno</span>
                : 'Nie'}
            </div>
          )}
        </div>

        {/* ── Popis problému ── */}
        <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Popis problému</div>

        <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
          <span className="crm-field-label">Popis problému <InfoTooltip text={JOB_DETAIL_TOOLTIPS.description} /></span>
          {isEditing ? (
            <textarea
              className="crm-field-input"
              rows={3}
              value={job.description || ''}
              onChange={e => setJob(prev => prev ? { ...prev, description: e.target.value } : prev)}
            />
          ) : (
            <div className="crm-field-value">{job.description || '—'}</div>
          )}
        </div>

        {/* ── Poistné krytie ── */}
        <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Poistné krytie</div>

        <div className="crm-field">
          <span className="crm-field-label">Limit ({job.customer_country === 'CZ' ? 'Kč' : '€'}) <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageLimit} /></span>
          {isEditing ? (
            <input
              type="number"
              className="crm-field-input"
              value={job.coverage.totalLimit > 0 ? job.coverage.totalLimit : ''}
              placeholder="napr. 7000"
              min="0"
              step="1"
              onChange={e => setJob(prev => prev ? ({
                ...prev,
                coverage: {
                  ...prev.coverage,
                  totalLimit: e.target.value !== '' ? Math.round(parseFloat(e.target.value)) : 0,
                },
              }) : prev)}
            />
          ) : (
            <div className="crm-field-value">
              {job.coverage.totalLimit > 0
                ? `${new Intl.NumberFormat('cs-CZ').format(job.coverage.totalLimit)} ${job.customer_country === 'CZ' ? 'Kč' : '€'}`
                : '—'}
            </div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Materiál <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageMaterial} /></span>
          {isEditing ? (
            <input
              type="text"
              className="crm-field-input"
              value={job.coverage.materialNote}
              placeholder="napr. v rámci limitu"
              onChange={e => setJob(prev => prev ? ({
                ...prev,
                coverage: { ...prev.coverage, materialNote: e.target.value },
              }) : prev)}
            />
          ) : (
            <div className="crm-field-value">{job.coverage.materialNote || '—'}</div>
          )}
        </div>

        <div className="crm-field">
          <span className="crm-field-label">Výjazdy <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageTravel} /></span>
          {isEditing ? (
            <input
              type="text"
              className="crm-field-input"
              value={job.coverage.travelNote}
              placeholder="napr. hradené extra"
              onChange={e => setJob(prev => prev ? ({
                ...prev,
                coverage: { ...prev.coverage, travelNote: e.target.value },
              }) : prev)}
            />
          ) : (
            <div className="crm-field-value">{job.coverage.travelNote || '—'}</div>
          )}
        </div>

        <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
          <span className="crm-field-label">⚠ Extra podmienka <InfoTooltip text={JOB_DETAIL_TOOLTIPS.coverageExtraCondition} /></span>
          {isEditing ? (
            <input
              type="text"
              className="crm-field-input"
              value={job.coverage.extraCondition || ''}
              placeholder="napr. Max 2 hodiny práce, 1 výjazd"
              onChange={e => setJob(prev => prev ? ({
                ...prev,
                coverage: { ...prev.coverage, extraCondition: e.target.value },
              }) : prev)}
            />
          ) : (
            <div className="crm-field-value" style={job.coverage.extraCondition ? { color: '#B8860B' } : undefined}>
              {job.coverage.extraCondition || '—'}
            </div>
          )}
        </div>

      </div>
      {isEditing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setIsEditing(false)}>Zrušiť</button>
          <button
            className="admin-btn admin-btn-gold admin-btn-sm"
            disabled={isSaving}
            onClick={() => handleSave({
              reference_number: job.reference_number,
              category: job.category,
              urgency: job.urgency,
              description: job.description,
              partner_id: job.partner_id,
              customer_country: job.customer_country,
              custom_fields: { ...job.custom_fields, coverage: job.coverage },
            })}
          >
            {isSaving ? 'Ukladám...' : 'Uložiť'}
          </button>
        </div>
      )}
    </SectionCollapsible>
  )
}
