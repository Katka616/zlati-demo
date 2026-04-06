'use client'

import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_LIST_TOOLTIPS } from '@/lib/tooltipContent'

interface ScenarioCounts {
  unassigned: number
  overdue: number
  waiting_approval: number
  today: number
  followup: number
}

interface JobsScenarioFiltersProps {
  activeScenario: string | null
  scenarioCounts: ScenarioCounts
  onToggleScenario: (key: string) => void
}

const SCENARIOS = [
  { key: 'unassigned', label: 'Nepridelené', icon: '👤', tooltip: JOB_LIST_TOOLTIPS.quickUnassigned },
  { key: 'overdue', label: 'Po termíne', icon: '⏰', tooltip: JOB_LIST_TOOLTIPS.quickOverdue },
  { key: 'waiting_approval', label: 'Čakajúce na schválenie', icon: '✋', tooltip: JOB_LIST_TOOLTIPS.quickWaitingApproval },
  { key: 'today', label: 'Dnes naplánované', icon: '📅', tooltip: JOB_LIST_TOOLTIPS.quickToday },
  { key: 'followup', label: 'Po termíne follow-up', icon: '📌', tooltip: JOB_LIST_TOOLTIPS.quickFollowup },
] as const

export default function JobsScenarioFilters({
  activeScenario,
  scenarioCounts,
  onToggleScenario,
}: JobsScenarioFiltersProps) {
  return (
    <div className="crm-scenario-filters">
      <InfoTooltip text={JOB_LIST_TOOLTIPS.quickFilters} position="below" />
      {SCENARIOS.map(s => (
        <button
          key={s.key}
          className={`crm-scenario-pill${activeScenario === s.key ? ' active' : ''}`}
          onClick={() => onToggleScenario(s.key)}
        >
          {s.icon} {s.label}
          <span className="count">({scenarioCounts[s.key]})</span>
          <InfoTooltip text={s.tooltip} position="below" />
        </button>
      ))}
    </div>
  )
}
