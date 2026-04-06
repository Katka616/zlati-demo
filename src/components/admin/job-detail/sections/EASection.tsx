'use client'

import SectionCollapsible from '@/components/admin/SectionCollapsible'
import { EA_LABELS as DB_EA_LABELS, type EaStatus } from '@/lib/constants'
import type { Job } from '@/data/mockData'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'

const DOC_STATUS: Record<string, string> = {
  pending: 'Čaká',
  approved: 'Schválené',
  rejected: 'Zamietnuté',
  submitted: 'Odoslané',
}

interface EASectionProps {
  job: Job
  sectionState: Record<string, boolean>
  eaReportText: string | null
}

export default function EASection({ job, sectionState, eaReportText: _eaReportText }: EASectionProps) {
  return (
    <SectionCollapsible
      id="sec-ea"
      icon="📄"
      title="Odhlásenie u poisťovne"
      forceOpen={sectionState['sec-ea']}
    >
      <div className="crm-field-grid">
        <div className="crm-field">
          <span className="crm-field-label">Stav <InfoTooltip text={JOB_DETAIL_TOOLTIPS.eaStatus} /></span>
          <div className="crm-field-value readonly">{DB_EA_LABELS[job.ea.status as EaStatus] || job.ea.status}</div>
        </div>
        <div className="crm-field">
          <span className="crm-field-label">Odoslane <InfoTooltip text={JOB_DETAIL_TOOLTIPS.eaSubmittedAt} /></span>
          <div className="crm-field-value readonly">{job.ea.submittedAt || '-'}</div>
        </div>
        <div className="crm-field full-width">
          <span className="crm-field-label">Dokumenty <InfoTooltip text={JOB_DETAIL_TOOLTIPS.eaDocuments} /></span>
          {job.ea.documents.map((doc, i) => (
            <div key={i} className="crm-field-value readonly" style={{ marginBottom: 4 }}>
              {doc.name} ({DOC_STATUS[doc.status] || doc.status})
            </div>
          ))}
        </div>
      </div>
    </SectionCollapsible>
  )
}
