'use client'

/**
 * HelpChatButton — Floating AI chat button + modal.
 * Allows operators to ask questions about the CRM in natural language.
 * Uses /api/admin/help-chat with the system manual as context.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  buildAdminAiPromptSuggestions,
  type AdminAiAgentEnvelope,
  type AdminAiContext,
  type AdminAiOverview,
  type AdminAiPromptSuggestion,
  type AdminAiSuggestion,
} from '@/lib/adminAiSuggestions'

interface HelpChatButtonProps {
  context?: AdminAiContext
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  overview?: AdminAiOverview
  suggestions?: AdminAiSuggestion[]
  agent?: AdminAiAgentEnvelope
}

interface HelpChatResponse {
  answer?: string
  overview?: AdminAiOverview
  suggestions?: AdminAiSuggestion[]
  agent?: AdminAiAgentEnvelope
  error?: string
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Som AI mozog pre tento pohľad. Po otvorení pripravím rýchly prehľad, kritické body a bezpečné ďalšie kroky. Akcie zatiaľ len odporúčam, nevykonávam ich.',
}

function BrainIcon({
  size = 16,
  stroke = 'currentColor',
  strokeWidth = 2,
}: {
  size?: number
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.79A3 3 0 0 1 2 12a3 3 0 0 1 3-3 2.5 2.5 0 0 1 4.5-7z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.79A3 3 0 0 0 22 12a3 3 0 0 0-3-3 2.5 2.5 0 0 0-4.5-7z"/>
    </svg>
  )
}

function normalizeOverview(overview?: AdminAiOverview): AdminAiOverview | undefined {
  if (!overview) return undefined

  const summary = Array.isArray(overview.summary) ? overview.summary.filter(Boolean) : []
  const criticalPoints = Array.isArray(overview.criticalPoints) ? overview.criticalPoints.filter(Boolean) : []

  if (summary.length === 0 && criticalPoints.length === 0) {
    return undefined
  }

  return { summary, criticalPoints }
}

export default function HelpChatButton({ context }: HelpChatButtonProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const overviewLoadedKey = useRef<string | null>(null)
  const overviewLoadingKey = useRef<string | null>(null)
  const promptSuggestions = useMemo(
    () => buildAdminAiPromptSuggestions(context),
    [context]
  )
  const contextKey = useMemo(() => {
    if (!context) return null
    return JSON.stringify({
      page: pathname,
      pageType: context.pageType,
      context,
    })
  }, [pathname, context])

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatOpen])

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [chatOpen])

  useEffect(() => {
    if (!chatOpen || !context || !contextKey) return
    if (overviewLoadedKey.current === contextKey || overviewLoadingKey.current === contextKey) return

    let active = true
    overviewLoadingKey.current = contextKey
    setLoading(true)
    setMessages([WELCOME_MESSAGE])

    const loadOverview = async () => {
      try {
        const res = await fetch('/api/admin/help-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'overview',
            page: pathname,
            context,
          }),
        })

        const data = await res.json() as HelpChatResponse
        if (!active) return

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.answer ?? 'Pripravil som rýchly prehľad aktuálneho pohľadu.',
          overview: normalizeOverview(data.overview),
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          agent: data.agent,
        }

        if (!res.ok) {
          setMessages([
            WELCOME_MESSAGE,
            {
              role: 'assistant',
              content: data.error ?? 'Prehľad aktuálneho pohľadu sa nepodarilo načítať. Skúste to prosím znova.',
            },
          ])
          return
        }

        overviewLoadedKey.current = contextKey
        setMessages([WELCOME_MESSAGE, assistantMessage])
      } catch {
        if (!active) return
        setMessages([
          WELCOME_MESSAGE,
          {
            role: 'assistant',
            content: 'Prehľad aktuálneho pohľadu sa nepodarilo načítať. Skontrolujte pripojenie a skúste to znova.',
          },
        ])
      } finally {
        if (active) {
          setLoading(false)
        }
        if (overviewLoadingKey.current === contextKey) {
          overviewLoadingKey.current = null
        }
      }
    }

    void loadOverview()

    return () => {
      active = false
    }
  }, [chatOpen, context, contextKey, pathname])

  const sendQuestion = async (rawQuestion: string, displayContent?: string) => {
    const question = rawQuestion.trim()
    if (!question || loading) return

    const userMsg: ChatMessage = { role: 'user', content: displayContent?.trim() || question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          question,
          page: pathname,
          ...(context ? { context } : {}),
        }),
      })

      const data = await res.json() as HelpChatResponse

      if (!res.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.error ?? 'Nastala chyba. Skúste to znova.' },
        ])
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer ?? 'Momentálne nemám pripravenú odpoveď.',
            overview: normalizeOverview(data.overview),
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            agent: data.agent,
          },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Nastala sieťová chyba. Skontrolujte pripojenie a skúste znova.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    await sendQuestion(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClose = () => {
    setChatOpen(false)
  }

  const handleSuggestionClick = (suggestion: AdminAiSuggestion) => {
    handleClose()

    if (suggestion.kind === 'navigate') {
      router.push(suggestion.target)
      return
    }

    const section = document.getElementById(suggestion.target)
    if (!section) return

    if (!section.classList.contains('open')) {
      const header = section.querySelector('.crm-section-header') as HTMLElement | null
      header?.click()
    }

    window.setTimeout(() => {
      if (typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 140)
  }

  const handlePromptSuggestionClick = (suggestion: AdminAiPromptSuggestion) => {
    if (loading) return
    void sendQuestion(suggestion.prompt, suggestion.label)
  }

  return (
    <>
      {/* Floating action button */}
      <button
        className="help-chat-fab"
        onClick={() => setChatOpen(prev => !prev)}
        aria-label="AI asistent"
        title="AI mozog — rýchly prehľad, kritické body a ďalší postup"
      >
        {chatOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <BrainIcon size={22} stroke="#fff" strokeWidth={2.1} />
        )}
      </button>

      {/* Chat modal */}
      {chatOpen && (
        <>
          <div
            className="help-chat-modal-backdrop"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div
            className="help-chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label="AI asistent"
          >
            {/* Modal header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--g7)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <BrainIcon stroke="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark)' }}>
                    AI Mozog
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--g4)' }}>
                    Rýchly prehľad, kritické body, ďalší postup
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Zavrieť chat"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--g4)',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="help-chat-messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`help-chat-msg ${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      <BrainIcon size={12} stroke="#fff" strokeWidth={2.2} />
                    </div>
                  )}
                  <div className="help-chat-msg-content">
                    <div className="help-chat-msg-bubble">
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && msg.overview && (
                      <div className="help-chat-overview">
                        {msg.overview.summary.length > 0 && (
                          <section className="help-chat-overview-card">
                            <div className="help-chat-section-title">Rýchly prehľad</div>
                            <ul className="help-chat-overview-list">
                              {msg.overview.summary.map((item, index) => (
                                <li key={`summary-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </section>
                        )}
                        {msg.overview.criticalPoints.length > 0 && (
                          <section className="help-chat-overview-card critical">
                            <div className="help-chat-section-title">Kritické body</div>
                            <ul className="help-chat-overview-list">
                              {msg.overview.criticalPoints.map((item, index) => (
                                <li key={`critical-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="help-chat-suggestions-wrap">
                        <div className="help-chat-section-title">Navrhované ďalšie postupy</div>
                        <div className="help-chat-suggestions">
                          {msg.suggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.id}-${suggestion.target}`}
                            type="button"
                            className="help-chat-suggestion"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <span className="help-chat-suggestion-kicker">Krok {index + 1}</span>
                            <span className="help-chat-suggestion-label">{suggestion.label}</span>
                            <span className="help-chat-suggestion-reason">{suggestion.reason}</span>
                          </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.agent && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid #E8E2D6',
                          background: '#F8F6F1',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: 'var(--dark)' }}>Agent-ready režim:</strong>{' '}
                        {msg.agent.summary}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="help-chat-msg assistant">
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    <BrainIcon size={12} stroke="#fff" strokeWidth={2.2} />
                  </div>
                  <div className="help-chat-msg-bubble" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span className="help-chat-dot" />
                    <span className="help-chat-dot" style={{ animationDelay: '0.15s' }} />
                    <span className="help-chat-dot" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {promptSuggestions.length > 0 && (
              <div className="help-chat-prompt-section">
                <div className="help-chat-section-title">Rýchle otázky pre AI</div>
                <div className="help-chat-prompt-suggestions">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="help-chat-prompt-chip"
                      onClick={() => handlePromptSuggestionClick(suggestion)}
                      disabled={loading}
                      title={suggestion.prompt}
                    >
                      <span className="help-chat-prompt-chip-label">{suggestion.label}</span>
                      <span className="help-chat-prompt-chip-reason">{suggestion.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input row */}
            <div className="help-chat-input-row">
              <textarea
                ref={inputRef}
                className="help-chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napíšte otázku alebo si nechajte spresniť ďalší postup..."
                rows={2}
                maxLength={500}
                disabled={loading}
                aria-label="Otázka pre AI asistenta"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="help-chat-send-btn"
                aria-label="Odoslať otázku"
                title="Odoslať (Enter)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
