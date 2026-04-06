'use client'

import { useState, useEffect, useCallback } from 'react'

interface InboxAIAssistantProps {
  emailId: number
  jobId: number | null
  onInsertReply: (text: string) => void
}

export default function InboxAIAssistant({ emailId, jobId, onInsertReply }: InboxAIAssistantProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'reply'>('summary')
  const [summary, setSummary] = useState<Record<string, any> | null>(null)
  const [reply, setReply] = useState<string>('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingReply, setLoadingReply] = useState(false)

  useEffect(() => {
    setSummary(null)
    setReply('')
    setExpanded(false)
    setActiveTab('summary')
  }, [emailId])

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/admin/emails/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('[InboxAIAssistant] fetchSummary', err)
    } finally {
      setLoadingSummary(false)
    }
  }, [emailId])

  const fetchReply = useCallback(async () => {
    setLoadingReply(true)
    try {
      const res = await fetch('/api/admin/emails/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (res.ok) {
        const data = await res.json()
        setReply(data.suggestedReply)
      }
    } catch (err) {
      console.error('[InboxAIAssistant] fetchReply', err)
    } finally {
      setLoadingReply(false)
    }
  }, [emailId])

  useEffect(() => {
    if (!expanded || activeTab !== 'summary' || summary) return
    fetchSummary()
  // summary intentionally excluded to avoid re-fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, activeTab])

  const hasSummaryData = summary && Object.keys(summary).length > 0

  const renderSummarySection = (
    title: string,
    data: Record<string, string | number | null | undefined> | undefined
  ) => {
    if (!data) return null
    const entries = Object.entries(data).filter(([, v]) => v != null && v !== '')
    if (entries.length === 0) return null
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 6,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#334155',
            lineHeight: 1.6,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {entries.map(([key, value]) => (
            <div key={key}>
              <span style={{ color: '#64748b' }}>{key}:</span>{' '}
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'linear-gradient(135deg, #f8fafc, #faf8ff)',
          border: '1px solid #e2e8f0',
          borderRadius: expanded ? '10px 10px 0 0' : 10,
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          userSelect: 'none',
        }}
      >
        {/* AI icon */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A843, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✦</span>
        </div>

        {/* Title */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            flex: 1,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          AI Asistent
        </span>

        {/* Tab switcher (only when expanded) */}
        {expanded && (
          <div
            style={{ display: 'flex', gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {(['summary', 'reply'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#0f172a' : '#f1f5f9',
                  color: activeTab === tab ? '#fff' : '#64748b',
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {tab === 'summary' ? 'Súhrn' : 'Odpoveď'}
              </button>
            ))}
          </div>
        )}

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            color: '#94a3b8',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path
            d="M5 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            padding: '12px 16px 16px',
          }}
        >
          {activeTab === 'summary' && (
            <div>
              {loadingSummary ? (
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    fontFamily: "'Montserrat', sans-serif",
                    padding: '8px 0',
                  }}
                >
                  Načítavam kontext...
                </div>
              ) : !hasSummaryData ? (
                <div
                  style={{
                    fontSize: 13,
                    color: '#94a3b8',
                    fontFamily: "'Montserrat', sans-serif",
                    padding: '8px 0',
                  }}
                >
                  Žiadne dáta k dispozícii
                </div>
              ) : (
                <div>
                  {renderSummarySection('Zákazka', summary.job)}
                  {renderSummarySection('Klient', summary.client)}
                  {renderSummarySection('Partner', summary.partner)}
                  {renderSummarySection('Technik', summary.technician)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reply' && (
            <div>
              {!reply && !loadingReply && (
                <button
                  onClick={fetchReply}
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    padding: '9px 20px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Navrhnúť odpoveď
                </button>
              )}

              {loadingReply && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    fontFamily: "'Montserrat', sans-serif",
                    padding: '8px 0',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
                  Generujem odpoveď...
                </div>
              )}

              {reply && !loadingReply && (
                <div>
                  <div
                    style={{
                      border: '1px dashed rgba(212, 168, 67, 0.25)',
                      background: '#fff',
                      borderRadius: 8,
                      padding: 14,
                      fontSize: 13,
                      color: '#334155',
                      lineHeight: 1.65,
                      fontStyle: 'italic',
                      fontFamily: "'Montserrat', sans-serif",
                      marginBottom: 10,
                    }}
                  >
                    {reply}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onInsertReply(reply)}
                      style={{
                        background: '#D4A843',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      Vložiť do odpovede
                    </button>
                    <button
                      onClick={fetchReply}
                      style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      Regenerovať
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
