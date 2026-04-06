'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { type DispatchJob } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import DictateInput from '@/components/ui/DictateInput'
import { parseDbDate } from '@/lib/date-utils'

interface ApiMessage {
    id: number
    from: string
    message: string
    source?: string
    delivered_at?: string | null
    read_at?: string | null
    created_at: string
}

interface TechChatModalProps {
    job: DispatchJob
    jobId: number
    lang: Language
    onClose: () => void
}

function formatTime(isoString: string): string {
    try {
        const d = parseDbDate(isoString)
        if (!d) return ''
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    } catch {
        return ''
    }
}

export default function TechChatModal({ job, jobId, lang, onClose }: TechChatModalProps) {
    const [activeTab, setActiveTab] = useState<'tech-client' | 'dispatch'>('dispatch')
    const [input, setInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const [messages, setMessages] = useState<ApiMessage[]>([])
    const messagesRef = useRef<HTMLDivElement>(null)
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const t = (key: string) => getTranslation(lang, key)
    const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk

    const fetchMessages = useCallback(async (channel: 'dispatch' | 'tech-client') => {
        if (!jobId) return
        try {
            const res = await fetch(`/api/dispatch/chat/${jobId}?channel=${channel}`, {
                credentials: 'include',
            })
            if (!res.ok) return
            const data = await res.json()
            if (data.success && Array.isArray(data.messages)) {
                setMessages(data.messages)
            }
        } catch (err) {
            console.error('TechChat fetch error', err)
        }
    }, [jobId])

    // Initial fetch + polling while modal is open — re-fetch when tab changes
    useEffect(() => {
        fetchMessages(activeTab)

        pollIntervalRef.current = setInterval(() => fetchMessages(activeTab), 5000)

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
            }
        }
    }, [fetchMessages, activeTab])

    // Messages are already filtered by channel from API
    const displayMessages = messages

    // Auto-scroll
    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight
        }
    }, [displayMessages, activeTab])

    const handleSend = async () => {
        const text = input.trim()
        if (!text) return
        setSendError(null)

        // Optimistic append
        const now = new Date()
        const optimisticMsg: ApiMessage = {
            id: Date.now(),
            from: 'tech',
            message: text,
            created_at: now.toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])
        setInput('')

        setIsSending(true)
        try {
            const res = await fetch(`/api/dispatch/chat/${jobId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, recipient: activeTab === 'tech-client' ? 'client' : 'dispatch' }),
            })
            if (!res.ok) {
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
                if (res.status === 401) {
                    setSendError(tl('Vaša relácia vypršala. Presmerujeme na prihlásenie…', 'Vaše relace vypršela. Přesměrujeme na přihlášení…'))
                    setTimeout(() => { window.location.href = '/login' }, 1500)
                } else {
                    setSendError(tl('Správu sa nepodarilo odoslať', 'Zprávu se nepodařilo odeslat'))
                }
                return
            }
            // Immediately fetch fresh messages (includes any bot reply)
            await fetchMessages(activeTab)
        } catch (err) {
            console.error('TechChat send error', err)
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            setSendError(tl('Chyba pripojenia', 'Chyba připojení'))
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 450, padding: 0, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', maxHeight: '80vh',
                background: 'var(--bg-modal, #fff)', borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                animation: 'slide-up 0.25s ease-out',
            }}>

                {/* Header so záložkami */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', position: 'relative' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        ✕
                    </button>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: 'var(--text-primary)' }}>
                        {t('dispatch.communication')}
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setActiveTab('dispatch')}
                            style={{
                                flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                                background: activeTab === 'dispatch' ? 'var(--chat-outgoing)' : 'var(--btn-secondary-bg)',
                                color: activeTab === 'dispatch' ? '#fff' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'dispatch' ? 600 : 400,
                                cursor: 'pointer'
                            }}
                        >
                            🎧 Dispečing & AI
                        </button>
                        <button
                            onClick={() => setActiveTab('tech-client')}
                            style={{
                                flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                                background: activeTab === 'tech-client' ? 'var(--chat-outgoing)' : 'var(--btn-secondary-bg)',
                                color: activeTab === 'tech-client' ? '#fff' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'tech-client' ? 600 : 400,
                                cursor: 'pointer'
                            }}
                        >
                            👤 Klient
                        </button>
                    </div>
                </div>

                {/* Content - Chat vnútro */}
                <div
                    ref={messagesRef}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        minHeight: '300px'
                    }}
                >
                    {displayMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
                            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💬</span>
                            {t('dispatch.noMessagesCategory')}
                            {activeTab === 'dispatch' && (
                                <div style={{ fontSize: 12, marginTop: 8 }}>
                                    AI Bot vyrieši bežné otázky, zložitejšie presmeruje na operátora.
                                </div>
                            )}
                        </div>
                    ) : (
                        displayMessages.map((msg, i) => {
                            const isTech = msg.from === 'tech'
                            return (
                                <div key={msg.id ?? i} style={{ display: 'flex', flexDirection: 'column', alignItems: isTech ? 'flex-end' : 'flex-start' }}>
                                    {!isTech && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, marginLeft: 4 }}>
                                            {msg.from === 'client' ? 'Klient' : msg.from === 'system' ? 'Systém' : 'Dispečing (AI/Operátor)'}
                                        </span>
                                    )}
                                    <div style={{
                                        background: isTech ? 'var(--chat-outgoing)' : (msg.from === 'system' ? 'var(--chat-incoming)' : 'var(--chat-system)'),
                                        color: isTech ? '#fff' : 'var(--text-primary)',
                                        padding: '8px 12px',
                                        borderRadius: 12,
                                        borderBottomRightRadius: isTech ? 2 : 12,
                                        borderBottomLeftRadius: isTech ? 12 : 2,
                                        maxWidth: '85%',
                                        fontSize: 14,
                                        lineHeight: 1.4
                                    }}>
                                        {msg.message}
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, marginRight: isTech ? 4 : 0, marginLeft: isTech ? 0 : 4 }}>
                                        {formatTime(msg.created_at)}
                                        {isTech && (
                                            <span
                                                title={msg.read_at ? 'Prečítané' : msg.delivered_at ? 'Doručené' : 'Odoslané'}
                                                style={{
                                                    marginLeft: 4,
                                                    fontWeight: 700,
                                                    color: msg.read_at ? '#60A5FA' : msg.delivered_at ? 'var(--text-muted)' : 'var(--text-muted)',
                                                    opacity: msg.read_at ? 1 : msg.delivered_at ? 0.8 : 0.5,
                                                    letterSpacing: (msg.read_at || msg.delivered_at) ? '-1px' : '0',
                                                }}
                                            >
                                                {msg.read_at ? '\u2713\u2713' : msg.delivered_at ? '\u2713\u2713' : '\u2713'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Send error */}
                {sendError && (
                    <div className="ajf-chat-error-bar" onClick={() => setSendError(null)}>
                        {sendError}
                    </div>
                )}
                {/* Input Bar */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('dispatch.chat.typePlaceholder')}
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '1px solid var(--input-border)',
                            borderRadius: 20,
                            outline: 'none',
                            fontSize: 14,
                        }}
                    />
                    <DictateInput
                        lang={lang}
                        onTranscript={(text) => setInput(prev => prev ? prev + ' ' + text : text)}
                        size={40}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        style={{
                            background: 'var(--chat-outgoing)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: input.trim() && !isSending ? 'pointer' : 'default',
                            opacity: input.trim() && !isSending ? 1 : 0.5
                        }}
                    >
                        {isSending ? '⏳' : '➤'}
                    </button>
                </div>
            </div>
        </div>
    )
}
