'use client'

import SectionCollapsible from '@/components/admin/SectionCollapsible'
import type { Job } from '@/data/mockData'

interface AIValidationSectionProps {
  job: Job
  sectionState: Record<string, boolean>
}

export default function AIValidationSection({ job: _job, sectionState }: AIValidationSectionProps) {
  return (
    <SectionCollapsible
      id="sec-ai"
      icon="🤖"
      title="AI Validácia"
      forceOpen={sectionState['sec-ai']}
    >
      <div style={{ padding: '12px 16px', color: 'var(--g4)', fontSize: 14 }}>
        AI validácia bude dostupná po odoslaní protokolu.
      </div>
    </SectionCollapsible>
  )
}
