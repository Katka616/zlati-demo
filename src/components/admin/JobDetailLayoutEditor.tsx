'use client'

/**
 * JobDetailLayoutEditor — floating bottom panel pre konfiguráciu rozloženia job detail stránky.
 * Umožňuje zobrazovať/skrývať sekcie a sidebar widgety, ukladá do /api/admin/page-layout.
 */

import { JOB_DETAIL_SECTIONS, SIDEBAR_WIDGETS } from '@/lib/pageLayout'
import type { SectionSlot } from '@/lib/pageLayout'

interface JobDetailLayoutEditorProps {
  sections: SectionSlot[]
  sidebarWidgets: SectionSlot[]
  onSectionsChange: (sections: SectionSlot[]) => void
  onSidebarChange: (widgets: SectionSlot[]) => void
  onSave: () => void
  onReset: () => void
  onClose: () => void
}

export default function JobDetailLayoutEditor({
  sections,
  sidebarWidgets,
  onSectionsChange,
  onSidebarChange,
  onSave,
  onReset,
  onClose,
}: JobDetailLayoutEditorProps) {
  const mandatorySectionIds = new Set(
    JOB_DETAIL_SECTIONS.filter(s => s.isMandatory).map(s => s.id)
  )
  const mandatoryWidgetIds = new Set(
    SIDEBAR_WIDGETS.filter(w => w.isMandatory).map(w => w.id)
  )

  function toggleSection(id: string) {
    if (mandatorySectionIds.has(id)) return
    onSectionsChange(
      sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
    )
  }

  function toggleWidget(id: string) {
    if (mandatoryWidgetIds.has(id)) return
    onSidebarChange(
      sidebarWidgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    )
  }

  // Build lookup maps for quick access
  const sectionVisibility = Object.fromEntries(sections.map(s => [s.id, s.visible]))
  const widgetVisibility = Object.fromEntries(sidebarWidgets.map(w => [w.id, w.visible]))

  return (
    <div className="job-detail-layout-editor">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>
          ⚙ Prispôsobiť rozloženie
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: 'var(--g4)',
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 4,
          }}
          title="Zavrieť"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 14 }}>
        {/* Sections */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sekcie
          </div>
          <div className="layout-editor-grid">
            {JOB_DETAIL_SECTIONS.map(def => {
              const isMandatory = mandatorySectionIds.has(def.id)
              const isVisible = sectionVisibility[def.id] ?? true
              return (
                <label
                  key={def.id}
                  className={`layout-editor-item${!isVisible ? ' is-hidden' : ''}${isMandatory ? ' is-mandatory' : ''}`}
                  title={isMandatory ? 'Povinná sekcia' : undefined}
                  style={{ cursor: isMandatory ? 'not-allowed' : 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isMandatory}
                    onChange={() => toggleSection(def.id)}
                    style={{ cursor: isMandatory ? 'not-allowed' : 'pointer' }}
                  />
                  <span style={{ fontSize: 14 }}>{def.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{def.title}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sidebar
          </div>
          <div className="layout-editor-grid">
            {SIDEBAR_WIDGETS.map(def => {
              const isMandatory = mandatoryWidgetIds.has(def.id)
              const isVisible = widgetVisibility[def.id] ?? true
              return (
                <label
                  key={def.id}
                  className={`layout-editor-item${!isVisible ? ' is-hidden' : ''}${isMandatory ? ' is-mandatory' : ''}`}
                  title={isMandatory ? 'Povinný widget' : undefined}
                  style={{ cursor: isMandatory ? 'not-allowed' : 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isMandatory}
                    onChange={() => toggleWidget(def.id)}
                    style={{ cursor: isMandatory ? 'not-allowed' : 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{def.title}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--g3)', paddingTop: 12 }}>
        <button
          onClick={onReset}
          style={{
            background: 'none',
            border: '1px solid var(--g4)',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--dark)',
            cursor: 'pointer',
          }}
        >
          Obnoviť default
        </button>
        <button
          onClick={onSave}
          style={{
            background: 'var(--gold)',
            border: 'none',
            borderRadius: 8,
            padding: '7px 20px',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Uložiť
        </button>
      </div>
    </div>
  )
}
