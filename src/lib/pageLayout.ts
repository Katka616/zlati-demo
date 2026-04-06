// Job Detail section and sidebar widget layout definitions
// Used by /admin/jobs/[id] and the page-layout API

export interface SectionDef {
  id: string
  icon: string
  title: string
  isMandatory: boolean
  conditionalPartner?: number  // visible only when job.partner_id matches this value
}

export interface WidgetDef {
  id: string
  title: string
  isMandatory: boolean
}

export interface SectionSlot {
  id: string
  visible: boolean
  order: number
}

export interface JobDetailLayout {
  version: 1
  sections: SectionSlot[]
  sidebarWidgets: SectionSlot[]
}

// ── Section catalogue ─────────────────────────────────────────────────────────

export const JOB_DETAIL_SECTIONS: SectionDef[] = [
  { id: 'sec-notes',       icon: '📜', title: 'Timeline',                isMandatory: true  },
  { id: 'sec-basic',       icon: '📋', title: 'Základné informácie',     isMandatory: false },
  { id: 'sec-order-email', icon: '📧', title: 'Pôvodná objednávka',      isMandatory: false },
  { id: 'sec-diagnostic',  icon: '🔍', title: 'Diagnostický formulár',   isMandatory: false },
  { id: 'sec-customer',    icon: '👤', title: 'Zákazník',                isMandatory: false },
  { id: 'sec-tech',        icon: '👷', title: 'Technik & Priradenie',    isMandatory: false },
  { id: 'sec-handyman',    icon: '📱', title: 'Handyman app',            isMandatory: false },
  { id: 'sec-pricing',     icon: '💰', title: 'Cenová kalkulácia',       isMandatory: false },
  { id: 'sec-ai',          icon: '🤖', title: 'AI Validácia',            isMandatory: false },
  { id: 'sec-ea',          icon: '📄', title: 'EA Odhláška',             isMandatory: false, conditionalPartner: 2 },
  { id: 'sec-payment',     icon: '💳', title: 'Platba',                  isMandatory: false },
]

// ── Sidebar widget catalogue ──────────────────────────────────────────────────

export const SIDEBAR_WIDGETS: WidgetDef[] = [
  { id: 'status_pipeline',   title: 'Pipeline krokov',  isMandatory: true  },
  { id: 'quick_actions',     title: 'Rýchle akcie',     isMandatory: false },
  { id: 'pricing_widget',    title: 'Cenový prehľad',   isMandatory: false },
  { id: 'key_metrics',       title: 'KPI metriky',      isMandatory: false },
  { id: 'sla_deadline',      title: 'SLA odpočet',      isMandatory: false },
  { id: 'invoice_tracking',  title: 'Fakturácia',       isMandatory: false },
  { id: 'documents_photos',  title: 'Dokumenty & Fotky', isMandatory: false },
  { id: 'client_rating',     title: 'Hodnotenie klienta', isMandatory: false },
]

// ── Default layout ────────────────────────────────────────────────────────────

export function getDefaultJobDetailLayout(): JobDetailLayout {
  return {
    version: 1,
    sections: JOB_DETAIL_SECTIONS.map((s, i) => ({
      id: s.id,
      visible: true,
      order: i,
    })),
    sidebarWidgets: SIDEBAR_WIDGETS.map((w, i) => ({
      id: w.id,
      visible: true,
      order: i,
    })),
  }
}

// ── Sanitize ──────────────────────────────────────────────────────────────────

const KNOWN_SECTION_IDS = new Set(JOB_DETAIL_SECTIONS.map(s => s.id))
const KNOWN_WIDGET_IDS  = new Set(SIDEBAR_WIDGETS.map(w => w.id))

function sanitizeSlots(
  raw: unknown,
  knownIds: Set<string>,
  defaults: SectionSlot[],
  mandatoryIds: Set<string>,
): SectionSlot[] {
  const parsed: SectionSlot[] = []
  const seenIds = new Set<string>()

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const slot = item as Record<string, unknown>
      const id = typeof slot.id === 'string' ? slot.id : null
      if (!id || !knownIds.has(id) || seenIds.has(id)) continue

      // Mandatory slots are always visible regardless of stored value
      const isMandatory = mandatoryIds.has(id)
      const visible = isMandatory ? true : typeof slot.visible === 'boolean' ? slot.visible : true
      const order   = typeof slot.order === 'number' && Number.isFinite(slot.order) ? slot.order : parsed.length

      parsed.push({ id, visible, order })
      seenIds.add(id)
    }
  }

  // Append any known slots that were missing from stored data
  for (const def of defaults) {
    if (!seenIds.has(def.id)) {
      parsed.push({ id: def.id, visible: true, order: parsed.length })
    }
  }

  // Re-normalize order values to be contiguous integers
  parsed.sort((a, b) => a.order - b.order)
  return parsed.map((s, i) => ({ ...s, order: i }))
}

export function sanitizeJobDetailLayout(input: unknown): JobDetailLayout {
  const defaults = getDefaultJobDetailLayout()
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}

  const mandatorySectionIds = new Set(JOB_DETAIL_SECTIONS.filter(s => s.isMandatory).map(s => s.id))
  const mandatoryWidgetIds  = new Set(SIDEBAR_WIDGETS.filter(w => w.isMandatory).map(w => w.id))

  return {
    version: 1,
    sections: sanitizeSlots(
      source.sections,
      KNOWN_SECTION_IDS,
      defaults.sections,
      mandatorySectionIds,
    ),
    sidebarWidgets: sanitizeSlots(
      source.sidebarWidgets,
      KNOWN_WIDGET_IDS,
      defaults.sidebarWidgets,
      mandatoryWidgetIds,
    ),
  }
}
