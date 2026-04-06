'use client'

import React, { useState, useCallback } from 'react'
import { ChevronRight, RefreshCw, Check, X, Sparkles } from 'lucide-react'

interface AiFieldDef {
  id: number
  field_key: string
  label: string
  output_format: 'text' | 'number' | 'label' | 'json'
  output_options: string[]
}

interface AiFieldVal {
  id: number
  value: string | null
  is_error: boolean
  error_message: string | null
  model_used: string | null
  generated_at: string
  triggered_by: string
  manually_edited: boolean
}

interface AiFieldEntry {
  definition: AiFieldDef
  value: AiFieldVal | null
}

interface AiFieldsSectionProps {
  jobId: number
}

const LABEL_COLORS: Record<string, { bg: string; color: string }> = {
  nizky: { bg: '#DEF7EC', color: '#03543F' },
  stredny: { bg: '#FEF3C7', color: '#92400E' },
  vysoky: { bg: '#FEE2E2', color: '#991B1B' },
  vynikajuca: { bg: '#DEF7EC', color: '#03543F' },
  dobra: { bg: '#DBEAFE', color: '#1E40AF' },
  nedostatocna: { bg: '#FEE2E2', color: '#991B1B' },
  pozitivny: { bg: '#DEF7EC', color: '#03543F' },
  neutralny: { bg: '#F3F4F6', color: '#374151' },
  negativny: { bg: '#FEE2E2', color: '#991B1B' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'práve teraz'
  if (mins < 60) return `pred ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `pred ${hrs} hod.`
  const days = Math.floor(hrs / 24)
  return `pred ${days} dňami`
}

export default function AiFieldsSection({ jobId }: AiFieldsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState<AiFieldEntry[]>([])
  const [generating, setGenerating] = useState<number | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-fields`)
      if (res.ok) {
        const data = await res.json()
        setFields(data.fields || [])
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [jobId])

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !loaded) fetchFields()
  }

  const handleGenerate = async (defId: number) => {
    setGenerating(defId)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-fields/${defId}/generate`, { method: 'POST' })
      if (res.ok) {
        await fetchFields()
      }
    } catch { /* ignore */ }
    finally { setGenerating(null) }
  }

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    try {
      for (const entry of fields) {
        setGenerating(entry.definition.id)
        try {
          await fetch(`/api/admin/jobs/${jobId}/ai-fields/${entry.definition.id}/generate`, { method: 'POST' })
        } catch { /* ignore single failure */ }
      }
      await fetchFields()
    } catch { /* ignore */ }
    finally {
      setGenerating(null)
      setGeneratingAll(false)
    }
  }

  const startEdit = (defId: number, currentValue: string) => {
    setEditingId(defId)
    setEditValue(currentValue)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (defId: number) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-fields/${defId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      })
      if (res.ok) {
        setEditingId(null)
        setEditValue('')
        await fetchFields()
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const renderValue = (entry: AiFieldEntry) => {
    const { definition: def, value: val } = entry

    if (!val || val.value === null) {
      return (
        <span style={{ color: '#4B5563', fontSize: '13px', fontStyle: 'italic' }}>
          Negenerované
        </span>
      )
    }

    if (val.is_error) {
      return (
        <span style={{ color: '#DC2626', fontSize: '13px' }}>
          Chyba: {val.error_message || 'neznáma'}
        </span>
      )
    }

    if (def.output_format === 'label') {
      const colors = LABEL_COLORS[val.value.toLowerCase()] || { bg: '#F3F4F6', color: '#374151' }
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: colors.bg,
          color: colors.color,
        }}>
          {val.value}
        </span>
      )
    }

    return (
      <span style={{ fontSize: '13px', color: '#111827', lineHeight: '1.5' }}>
        {val.value}
      </span>
    )
  }

  return (
    <section style={{
      borderTop: '1px solid #E8E2D6',
      padding: '14px 20px',
    }}>
      {/* Header */}
      <div
        onClick={toggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', userSelect: 'none',
          marginBottom: expanded ? '14px' : 0,
        }}
      >
        <Sparkles size={15} style={{ color: '#bf953f' }} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151', fontFamily: 'inherit' }}>
          AI Polia
        </span>
        {loaded && fields.length > 0 && (
          <span style={{
            background: '#F3F4F6', color: 'var(--text-secondary)', fontSize: '11px',
            padding: '1px 7px', borderRadius: '10px', fontWeight: 600,
          }}>
            {fields.filter(f => f.value && !f.value.is_error).length}/{fields.length}
          </span>
        )}
        <ChevronRight size={14} style={{
          marginLeft: 'auto', color: '#4B5563',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </div>

      {/* Content */}
      {expanded && (
        loading ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#4B5563', fontSize: '13px' }}>
            Načítavam AI polia...
          </div>
        ) : fields.length === 0 ? (
          <div style={{ padding: '12px 0', color: '#4B5563', fontSize: '13px' }}>
            Žiadne AI polia nakonfigurované.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Generovať všetky — hlavný CTA */}
            <button
              onClick={handleGenerateAll}
              disabled={generatingAll || generating !== null}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                width: '100%', padding: '8px 0',
                background: generatingAll ? '#E8E2D6' : '#bf953f',
                color: generatingAll ? '#92400E' : '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: generating !== null ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              <Sparkles size={14} />
              {generatingAll ? 'Generujem...' : 'Generovať všetky AI polia'}
            </button>
            {fields.map(entry => {
              const { definition: def, value: val } = entry
              const isEditing = editingId === def.id

              return (
                <div key={def.id} style={{
                  background: '#FAFAF8',
                  border: '1px solid #E8E2D6',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}>
                  {/* Label row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                      {def.label}
                    </span>
                    {val?.manually_edited && (
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                        background: '#FEF3C7', color: '#92400E', fontWeight: 600,
                      }}>
                        Upravené
                      </span>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                      {val?.manually_edited && (
                        <button
                          onClick={() => handleGenerate(def.id)}
                          disabled={generating === def.id}
                          title="Obnoviť AI"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#bf953f', fontSize: '11px', padding: '2px 4px',
                            fontFamily: 'inherit',
                          }}
                        >
                          Obnoviť AI
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerate(def.id)}
                        disabled={generating === def.id}
                        title="Regenerovať"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <RefreshCw
                          size={13}
                          style={{
                            color: generating === def.id ? '#D1D5DB' : '#4B5563',
                            animation: generating === def.id ? 'spin 1s linear infinite' : 'none',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Value */}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {def.output_format === 'label' ? (
                        <select
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{
                            padding: '6px 8px', fontSize: '13px', borderRadius: '6px',
                            border: '1px solid #D1D5DB', fontFamily: "'Montserrat', sans-serif",
                          }}
                        >
                          {def.output_options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          rows={2}
                          style={{
                            padding: '6px 8px', fontSize: '13px', borderRadius: '6px',
                            border: '1px solid #D1D5DB', fontFamily: "'Montserrat', sans-serif",
                            resize: 'vertical', width: '100%',
                          }}
                        />
                      )}
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEdit}
                          style={{
                            background: '#F3F4F6', border: 'none', borderRadius: '6px',
                            padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          <X size={12} /> Zrušiť
                        </button>
                        <button
                          onClick={() => saveEdit(def.id)}
                          disabled={saving}
                          style={{
                            background: '#bf953f', color: '#fff', border: 'none', borderRadius: '6px',
                            padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          <Check size={12} /> Uložiť
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => val?.value ? startEdit(def.id, val.value) : undefined}
                      style={{ cursor: val?.value ? 'pointer' : 'default' }}
                      title={val?.value ? 'Klikni pre úpravu' : undefined}
                    >
                      {renderValue(entry)}
                    </div>
                  )}

                  {/* Meta */}
                  {val && !val.is_error && val.generated_at && (
                    <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px' }}>
                      {timeAgo(val.generated_at)} · {val.model_used || 'AI'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Spin animation for regenerate button */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
