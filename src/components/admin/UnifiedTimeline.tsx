'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { TimelineEntry } from '@/lib/db'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface UnifiedTimelineProps {
  jobId: number
  jobRef: string
  currentUserPhone: string
  currentUserName?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
type FilterTab = 'all' | 'chat' | 'calls' | 'emails' | 'system' | 'notes'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Všetko' },
  { key: 'chat', label: 'Chat' },
  { key: 'calls', label: 'Hovory' },
  { key: 'emails', label: 'Emaily' },
  { key: 'system', label: 'Systém' },
  { key: 'notes', label: 'Poznámky' },
]

type InputChannel = 'note' | 'tech' | 'client' | 'call' | 'reminder'

const CHANNEL_BUTTONS: { key: InputChannel; icon: string; label: string }[] = [
  { key: 'note', icon: '\uD83D\uDCDD', label: 'Poznámka' },
  { key: 'tech', icon: '\uD83D\uDC77', label: 'Technik' },
  { key: 'client', icon: '\uD83D\uDC64', label: 'Klient' },
  { key: 'call', icon: '\u260E\uFE0F', label: 'Hovor' },
  { key: 'reminder', icon: '\uD83D\uDD14', label: 'Pripomienka' },
]

const CRM_STEP_SHORT: Record<number, string> = {
  0: 'Príjem',
  1: 'Dispatching',
  2: 'Naplánované',
  3: 'Na mieste',
  4: 'Schvaľovanie',
  5: 'Ponuka',
  6: 'Dokončené',
  7: 'Zúčtovanie',
  8: 'Cen. kontrola',
  9: 'EA odhláška',
  10: 'Fakturácia',
  11: 'Uhradené',
  12: 'Uzavreté',
}

const POLL_INTERVAL = 10_000
const MAX_MESSAGE_LENGTH = 2000

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------
function getAvatarStyle(entry: TimelineEntry): { bg: string; emoji: string } {
  if (entry.type === 'note') {
    return entry.is_pinned
      ? { bg: '#FEF3C7', emoji: '\uD83D\uDCCC' }
      : { bg: '#FEF3C7', emoji: '\uD83D\uDCDD' }
  }
  if (entry.type === 'audit') {
    return { bg: '#E5E7EB', emoji: '\u2699\uFE0F' }
  }
  if (entry.type === 'call') {
    return { bg: '#D1FAE5', emoji: '\u260E\uFE0F' }
  }
  if (entry.type === 'email') {
    return entry.email_direction === 'outbound'
      ? { bg: '#DBEAFE', emoji: '\u2709\uFE0F' }
      : { bg: '#E0E7FF', emoji: '\uD83D\uDCE8' }
  }
  if (entry.type === 'reminder') {
    return entry.is_reminder_completed
      ? { bg: '#D1FAE5', emoji: '\u2705' }
      : { bg: '#FEF3C7', emoji: '\uD83D\uDD14' }
  }
  // type === 'message'
  switch (entry.from_role) {
    case 'system':
      return { bg: '#E5E7EB', emoji: '\u2699\uFE0F' }
    case 'operator':
      return { bg: '#FDE68A', emoji: '\uD83D\uDC69\u200D\uD83D\uDCBC' }
    case 'tech':
      return { bg: '#FED7AA', emoji: '\uD83D\uDC77' }
    case 'client':
      return { bg: '#BFDBFE', emoji: '\uD83D\uDC64' }
    default:
      return { bg: '#E5E7EB', emoji: '\uD83D\uDCE8' }
  }
}

function getBubbleBg(entry: TimelineEntry): string {
  if (entry.type === 'note') {
    return entry.is_pinned ? '#FEF3C7' : '#FFFBEB'
  }
  if (entry.type === 'audit') return '#F3F4F6'
  if (entry.type === 'email') return '#EFF6FF'
  if (entry.type === 'call') return '#ECFDF5'
  if (entry.type === 'reminder') return entry.is_reminder_completed ? '#F0FDF4' : '#FFFBEB'
  switch (entry.from_role) {
    case 'operator':
      return '#FEF9C3'
    case 'tech':
      return '#FFF7ED'
    case 'client':
      return '#EFF6FF'
    case 'system':
      return '#F3F4F6'
    default:
      return '#F9FAFB'
  }
}

// ---------------------------------------------------------------------------
// Channel badge
// ---------------------------------------------------------------------------
interface BadgeStyle {
  label: string
  bg: string
  color: string
}

function getChannelBadge(entry: TimelineEntry): BadgeStyle | null {
  if (entry.type === 'note') {
    return { label: 'POZNÁMKA', bg: '#FEF3C7', color: '#92400E' }
  }
  if (entry.type === 'reminder') {
    return entry.is_reminder_completed
      ? { label: 'SPLNENÉ', bg: '#D1FAE5', color: '#065F46' }
      : { label: 'PRIPOMIENKA', bg: '#FEF3C7', color: '#92400E' }
  }
  if (entry.type === 'audit') {
    const action = entry.action ?? ''
    if (action.includes('gps') || action.includes('location'))
      return { label: 'GPS', bg: '#FEE2E2', color: '#B91C1C' }
    if (action.includes('match'))
      return { label: 'MATCHING', bg: '#F3E8FF', color: '#7C3AED' }
    return { label: 'AUTO', bg: '#E5E7EB', color: '#374151' }
  }
  if (entry.type === 'call') {
    if (entry.call_source === 'voicebot') {
      return { label: 'VOICEBOT', bg: '#DBEAFE', color: '#1D4ED8' }
    }
    return { label: 'HOVOR', bg: '#D1FAE5', color: '#065F46' }
  }
  if (entry.type === 'email') {
    return entry.email_direction === 'outbound'
      ? { label: 'EMAIL ODOSLANÝ', bg: '#DBEAFE', color: '#1D4ED8' }
      : { label: 'EMAIL PRIJATÝ', bg: '#E0E7FF', color: '#4338CA' }
  }
  // messages
  const src = (entry.source ?? '').toLowerCase()
  const ch = (entry.channel ?? '').toLowerCase()

  if (src === 'techapp' || ch === 'dispatch')
    return { label: 'TECH APP', bg: '#FED7AA', color: '#9A3412' }
  if (src === 'portal' || ch === 'client')
    return { label: 'PORTÁL', bg: '#BFDBFE', color: '#1E40AF' }
  if (src === 'crm') {
    if (ch === 'dispatch') return { label: '\u2192 TECHNIK', bg: 'transparent', color: '#EA580C' }
    if (ch === 'client') return { label: '\u2192 KLIENT', bg: 'transparent', color: '#2563EB' }
    return { label: 'CRM', bg: '#FDE68A', color: '#92400E' }
  }
  if (src === 'whatsapp') return { label: 'WHATSAPP', bg: '#D1FAE5', color: '#065F46' }
  if (src === 'system' || entry.from_role === 'system')
    return { label: 'AUTO', bg: '#E5E7EB', color: '#374151' }

  return null
}

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------
function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString())
    return `Dnes \u2014 ${d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' })}`
  if (d.toDateString() === yesterday.toDateString())
    return `Včera \u2014 ${d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' })}`
  return d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getNoteId(entry: TimelineEntry): number | null {
  if (!entry.id.startsWith('note-')) return null
  const n = parseInt(entry.id.replace('note-', ''), 10)
  return isNaN(n) ? null : n
}

function getAuthorLabel(entry: TimelineEntry): string {
  if (entry.type === 'note') return entry.author_name ?? 'Operátor'
  if (entry.type === 'audit') return entry.changed_by_name ?? entry.changed_by_role ?? 'Systém'
  if (entry.type === 'call') {
    if (entry.call_source === 'voicebot') return 'Voicebot'
    return entry.call_created_by_name ?? 'Operátor'
  }
  if (entry.type === 'email') return entry.email_from ?? 'Email'
  if (entry.type === 'reminder') return 'Pripomienka'
  switch (entry.from_role) {
    case 'operator':
      return 'Operátor'
    case 'tech':
      return 'Technik'
    case 'client':
      return 'Klient'
    case 'system':
      return 'Systém'
    default:
      return 'Neznámy'
  }
}

// ---------------------------------------------------------------------------
// TranscriptView — chat-bubble rendering of call transcripts
// ---------------------------------------------------------------------------

const SPEAKER_PATTERNS = [
  { pattern: /^(Asistent|AI|Bot|Voicebot)\s*:/i, role: 'ai' as const },
  { pattern: /^(Zákazník|Zakaznik|Klient|Technik|Užívateľ|Uzivatel|Caller|User)\s*:/i, role: 'user' as const },
]

function parseTranscriptLine(line: string): { role: 'ai' | 'user' | 'unknown'; speaker: string; text: string } {
  for (const { pattern, role } of SPEAKER_PATTERNS) {
    const match = line.match(pattern)
    if (match) {
      const speaker = match[1]
      const text = line.slice(match[0].length).trim()
      return { role, speaker, text }
    }
  }
  return { role: 'unknown', speaker: '', text: line }
}

function TranscriptView({ transcript, callerType }: { transcript: string; callerType?: string | null }) {
  const isTech = callerType === 'known_tech' || callerType === 'technician'
  const lines = transcript.split('\n').filter(l => l.trim())
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, i) => {
        const { role, speaker: rawSpeaker, text } = parseTranscriptLine(line)
        if (role === 'unknown') {
          return (
            <div key={i} style={{ fontSize: 11, color: 'var(--g5)', fontStyle: 'italic', padding: '0 4px' }}>
              {line}
            </div>
          )
        }
        const isAi = role === 'ai'
        const speaker = !isAi && isTech && /zákazník|zákaznik|klient/i.test(rawSpeaker)
          ? 'Technik'
          : rawSpeaker
        const callerEmoji = isTech ? '🔧' : '👤'
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isAi ? 'flex-start' : 'flex-end' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isAi ? '#6366f1' : '#047857', marginBottom: 2, padding: '0 6px' }}>
              {isAi ? '🤖' : callerEmoji} {speaker}
            </div>
            <div style={{
              maxWidth: '85%',
              fontSize: 12,
              lineHeight: 1.45,
              padding: '6px 10px',
              borderRadius: isAi ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
              background: isAi ? 'rgba(99,102,241,0.08)' : 'rgba(4,120,87,0.08)',
              border: `1px solid ${isAi ? 'rgba(99,102,241,0.2)' : 'rgba(4,120,87,0.2)'}`,
              color: 'var(--dark)',
            }}>
              {text}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function UnifiedTimeline({
  jobId,
  jobRef,
  currentUserPhone,
  currentUserName,
}: UnifiedTimelineProps) {
  // ---- State ----
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [inputChannel, setInputChannel] = useState<InputChannel>('note')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [callSummary, setCallSummary] = useState('')
  const [callTranscript, setCallTranscript] = useState('')
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [callCallerType, setCallCallerType] = useState<'client' | 'technician' | 'unknown'>('client')
  const [callDuration, setCallDuration] = useState('')
  const [callPhone, setCallPhone] = useState('')
  const [activeAudioCallId, setActiveAudioCallId] = useState<string | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- Fetch ----
  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/timeline`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      const data: TimelineEntry[] = await res.json()
      setEntries(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní timeline')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchTimeline()
    pollRef.current = setInterval(fetchTimeline, POLL_INTERVAL)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchTimeline])

  // ---- Filtered + grouped ----
  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    if (filter === 'chat') return entries.filter((e) => e.type === 'message')
    if (filter === 'calls') return entries.filter((e) => e.type === 'call')
    if (filter === 'emails') return entries.filter((e) => e.type === 'email')
    if (filter === 'system') return entries.filter((e) => e.type === 'audit')
    if (filter === 'notes') return entries.filter((e) => e.type === 'note' || e.type === 'reminder')
    return entries
  }, [entries, filter])

  const pinnedNotes = useMemo(
    () => entries.filter((e) => e.type === 'note' && e.is_pinned),
    [entries]
  )

  const grouped = useMemo(() => {
    const groups: { dateLabel: string; dateKey: string; items: TimelineEntry[] }[] = []
    const pinnedIds = new Set(pinnedNotes.map((p) => p.id))

    for (const entry of filtered) {
      // Skip pinned notes in the regular feed — they appear at the top
      if (pinnedIds.has(entry.id) && filter === 'all') continue

      const dk = getDateKey(entry.created_at)
      let group = groups.find((g) => g.dateKey === dk)
      if (!group) {
        group = { dateLabel: getDateLabel(entry.created_at), dateKey: dk, items: [] }
        groups.push(group)
      }
      group.items.push(entry)
    }
    return groups
  }, [filtered, pinnedNotes, filter])

  // ---- Send message / note ----
  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    const trimmedCallSummary = callSummary.trim()
    const trimmedCallTranscript = callTranscript.trim()
    if (inputChannel === 'reminder') {
      // Reminder channel — title is required, date+time required
      if (!text || !reminderDate || !reminderTime || sending) return
      const remindAt = new Date(`${reminderDate}T${reminderTime}:00`)
      if (isNaN(remindAt.getTime()) || remindAt <= new Date()) {
        setError('Termín pripomienky musí byť v budúcnosti')
        return
      }
      setSending(true)
      try {
        const res = await fetch('/api/admin/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: text,
            job_id: jobId,
            remind_at: remindAt.toISOString(),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Nepodarilo sa vytvoriť pripomienku')
        }
        setInputText('')
        setReminderDate('')
        setReminderTime('')
        await fetchTimeline()
        window.dispatchEvent(new CustomEvent('job-customer-emotion-refresh', { detail: { jobId } }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri vytváraní pripomienky')
      } finally {
        setSending(false)
      }
      return
    }

    if (inputChannel === 'call') {
      if ((!trimmedCallSummary && !trimmedCallTranscript) || sending) return

      setSending(true)
      try {
        const parsedDuration = callDuration.trim().length > 0 ? Number(callDuration) : null
        const res = await fetch(`/api/admin/jobs/${jobId}/call-transcripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: trimmedCallSummary || null,
            transcript: trimmedCallTranscript || null,
            direction: callDirection,
            caller_type: callCallerType,
            duration_seconds: parsedDuration != null && Number.isFinite(parsedDuration) ? parsedDuration : null,
            phone_number: callPhone.trim() || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Nepodarilo sa uložiť hovor')
        }
        setCallSummary('')
        setCallTranscript('')
        setCallDuration('')
        setCallPhone('')
        setCallDirection('outbound')
        setCallCallerType('client')
        await fetchTimeline()
        window.dispatchEvent(new CustomEvent('job-customer-emotion-refresh', { detail: { jobId } }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri ukladaní hovoru')
      } finally {
        setSending(false)
      }
      return
    }

    if (!text || sending) return

    setSending(true)
    try {
      if (inputChannel === 'note') {
        const res = await fetch(`/api/jobs/${jobId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Nepodarilo sa pridať poznámku')
        }
      } else {
        const to = inputChannel === 'tech' ? 'technician' : 'client'
        const res = await fetch(`/api/admin/jobs/${jobId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message: text }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Nepodarilo sa odoslať správu')
        }
      }
      setInputText('')
      await fetchTimeline()
      window.dispatchEvent(new CustomEvent('job-customer-emotion-refresh', { detail: { jobId } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odosielaní')
    } finally {
      setSending(false)
    }
  }, [
    callDirection,
    callCallerType,
    callDuration,
    callPhone,
    callSummary,
    callTranscript,
    inputText,
    inputChannel,
    jobId,
    sending,
    fetchTimeline,
    reminderDate,
    reminderTime,
  ])

  // ---- Note actions ----
  const handleTogglePin = useCallback(
    async (noteId: number) => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_pin' }),
        })
        if (!res.ok) throw new Error('Nepodarilo sa prepnúť pin')
        await fetchTimeline()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba')
      }
    },
    [jobId, fetchTimeline]
  )

  const handleDeleteNote = useCallback(
    async (noteId: number) => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Nepodarilo sa zmazať poznámku')
        await fetchTimeline()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba')
      }
    },
    [jobId, fetchTimeline]
  )

  const handleEditNote = useCallback(
    async (noteId: number) => {
      const text = editingText.trim()
      if (!text) return
      try {
        const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })
        if (!res.ok) throw new Error('Nepodarilo sa upraviť poznámku')
        setEditingNoteId(null)
        setEditingText('')
        await fetchTimeline()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba')
      }
    },
    [jobId, editingText, fetchTimeline]
  )

  // ---- Key handler ----
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // ---- Renders ----

  const renderStatusChange = (entry: TimelineEntry) => {
    const changes = entry.changes
    if (!changes || changes.length === 0) return null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {changes.map((ch, idx) => {
          if (ch.field === 'crm_step') {
            const oldStep = typeof ch.old === 'number' ? ch.old : parseInt(String(ch.old), 10)
            const newStep = typeof ch.new === 'number' ? ch.new : parseInt(String(ch.new), 10)
            const oldLabel = CRM_STEP_SHORT[oldStep] ?? `Step ${ch.old}`
            const newLabel = CRM_STEP_SHORT[newStep] ?? `Step ${ch.new}`
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                  }}
                >
                  {oldStep} {oldLabel}
                </span>
                <span style={{ color: 'var(--g4)', fontSize: 13 }}>{'\u2192'}</span>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#D1FAE5',
                    color: '#065F46',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                  }}
                >
                  {newStep} {newLabel}
                </span>
              </div>
            )
          }
          // Generic field change
          return (
            <div key={idx} style={{ fontSize: 12, color: 'var(--g4)', fontStyle: 'italic' }}>
              <strong style={{ fontWeight: 600 }}>{ch.field}</strong>:{' '}
              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{String(ch.old ?? '\u2014')}</span>
              {' \u2192 '}
              <span style={{ fontWeight: 500 }}>{String(ch.new ?? '\u2014')}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderEntryBody = (entry: TimelineEntry) => {
    const bubbleBg = getBubbleBg(entry)

    if (entry.type === 'note') {
      const noteId = getNoteId(entry)
      const isOwn = entry.author_phone === currentUserPhone
      const isEditing = editingNoteId === noteId

      return (
        <div
          style={{
            background: bubbleBg,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--dark)',
            lineHeight: 1.5,
            border: entry.is_pinned ? '1px solid #F59E0B' : '1px solid transparent',
          }}
        >
          {entry.is_pinned && (
            <div style={{ fontSize: 10, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
              {'\uD83D\uDCCC'} Pripnutá poznámka
            </div>
          )}
          {isEditing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid var(--g6)',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none',
                  background: 'var(--w)',
                  color: 'var(--dark)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && noteId !== null) handleEditNote(noteId)
                  if (e.key === 'Escape') {
                    setEditingNoteId(null)
                    setEditingText('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => noteId !== null && handleEditNote(noteId)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--dark)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Uložiť
              </button>
              <button
                onClick={() => {
                  setEditingNoteId(null)
                  setEditingText('')
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--g6)',
                  background: 'var(--w)',
                  color: 'var(--g4)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Zrušiť
              </button>
            </div>
          ) : (
            <>
              <div>{entry.content}</div>
              {/* Action buttons for notes */}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => noteId !== null && handleTogglePin(noteId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: entry.is_pinned ? '#D97706' : 'var(--g4)',
                    fontWeight: 500,
                    padding: 0,
                  }}
                  title={entry.is_pinned ? 'Odopnúť' : 'Pripnúť'}
                >
                  {entry.is_pinned ? '\uD83D\uDCCC Odopnúť' : '\uD83D\uDCCC Pripnúť'}
                </button>
                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        if (noteId !== null) {
                          setEditingNoteId(noteId)
                          setEditingText(entry.content ?? '')
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--accent)',
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      {'\u270F\uFE0F'} Upraviť
                    </button>
                    <button
                      onClick={() => noteId !== null && handleDeleteNote(noteId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--danger)',
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      {'\uD83D\uDDD1\uFE0F'} Zmazať
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )
    }

    if (entry.type === 'reminder') {
      const remindDate = entry.remind_at ? new Date(entry.remind_at) : null
      const remindFormatted = remindDate
        ? remindDate.toLocaleString('sk-SK', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null

      return (
        <div
          style={{
            background: bubbleBg,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--dark)',
            lineHeight: 1.5,
            border: entry.is_reminder_completed ? '1px solid #6EE7B7' : '1px solid #FCD34D',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: 2 }}>
            {entry.reminder_title}
          </div>
          {entry.reminder_description && (
            <div style={{ fontSize: 12, color: 'var(--g4)', marginBottom: 4 }}>
              {entry.reminder_description}
            </div>
          )}
          {remindFormatted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--g4)' }}>
                {'\uD83D\uDD54'} Termín: <strong style={{ color: 'var(--dark)', fontWeight: 600 }}>{remindFormatted}</strong>
              </span>
              {entry.is_reminder_completed && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background: '#D1FAE5',
                    color: '#065F46',
                    borderRadius: 4,
                    padding: '1px 6px',
                  }}
                >
                  Splnené
                </span>
              )}
            </div>
          )}
        </div>
      )
    }

    if (entry.type === 'audit') {
      const isStatusChange = entry.action === 'status_change'
      const actionLabel = entry.action?.replace(/_/g, ' ') ?? 'zmena'
      return (
        <div
          style={{
            background: bubbleBg,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--g4)',
            fontStyle: isStatusChange ? 'normal' : 'italic',
            lineHeight: 1.5,
          }}
        >
          {!isStatusChange && (
            <div style={{ marginBottom: 2, fontWeight: 500, color: 'var(--dark)', fontStyle: 'normal' }}>
              {actionLabel}
            </div>
          )}
          {renderStatusChange(entry)}
          {(!entry.changes || entry.changes.length === 0) && (
            <span>{actionLabel}</span>
          )}
        </div>
      )
    }

    if (entry.type === 'call') {
      const directionLabel = entry.call_direction === 'inbound' ? 'Prichádzajúci' : 'Odchádzajúci'
      const durationLabel = entry.call_duration_seconds != null
        ? `${Math.floor(entry.call_duration_seconds / 60)}m ${entry.call_duration_seconds % 60}s`
        : null
      const sourceLabel = entry.call_source === 'voicebot'
        ? '🤖 Voicebot'
        : entry.call_source === 'operator_provider'
          ? 'Operátor (provider)'
          : 'Operátor'
      const callerTypeLabel =
        entry.call_caller_type === 'client' ? '👤 Zákazník'
        : entry.call_caller_type === 'technician' ? '👷 Technik'
        : entry.call_caller_type === 'operator' ? '🎧 Operátor'
        : null

      return (
        <div
          style={{
            background: bubbleBg,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 13,
            color: 'var(--dark)',
            lineHeight: 1.5,
            border: '1px solid #A7F3D0',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>{sourceLabel}</span>
            <span style={{ fontSize: 11, color: 'var(--g4)' }}>{directionLabel}</span>
            {callerTypeLabel && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: entry.call_caller_type === 'client' ? '#1D4ED8' : entry.call_caller_type === 'technician' ? '#7C3AED' : 'var(--g4)',
                background: entry.call_caller_type === 'client' ? '#DBEAFE' : entry.call_caller_type === 'technician' ? '#EDE9FE' : 'transparent',
                borderRadius: 4,
                padding: '1px 6px',
              }}>{callerTypeLabel}</span>
            )}
            {durationLabel && (
              <span style={{ fontSize: 11, color: 'var(--g4)' }}>{durationLabel}</span>
            )}
            {entry.call_outcome && (() => {
              const outcomeMap: Record<string, { label: string; color: string; bg: string } | null> = {
                action_taken: null,
                info_only:    null,
                completed:    null,
                no_answer:    { label: 'Bez odpovede', color: '#92400E', bg: '#FEF3C7' },
                escalated:    { label: 'Prepojený na op.', color: '#7C3AED', bg: '#EDE9FE' },
                transferred:  { label: 'Presmerovaný', color: '#1D4ED8', bg: '#DBEAFE' },
                failed:       { label: 'Zlyhalo', color: '#DC2626', bg: '#FEE2E2' },
              }
              const style = outcomeMap[entry.call_outcome]
              if (!style) return null
              return (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: style.color, background: style.bg,
                  borderRadius: 4, padding: '1px 6px',
                }}>{style.label}</span>
              )
            })()}
          </div>
          {entry.call_summary && (
            <div style={{ marginBottom: entry.call_transcript || entry.call_ftp_filename ? 8 : 0 }}>{entry.call_summary}</div>
          )}
          {entry.call_transcript && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#047857', fontWeight: 600 }}>
                Zobraziť prepis hovoru
              </summary>
              <TranscriptView transcript={entry.call_transcript} callerType={entry.call_caller_type} />
            </details>
          )}
          {entry.call_ftp_filename && (
            <div style={{ marginTop: 8 }}>
              {activeAudioCallId === entry.call_id ? (
                <div>
                  <audio
                    controls
                    autoPlay
                    src={`/api/admin/jobs/${jobId}/call-recording/${entry.call_id}`}
                    style={{ width: '100%', height: 36, marginBottom: 4 }}
                  />
                  <button
                    onClick={() => setActiveAudioCallId(null)}
                    style={{
                      fontSize: 11,
                      color: 'var(--g4)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ✕ Zatvoriť
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveAudioCallId(entry.call_id ?? null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#047857',
                    fontWeight: 600,
                    padding: '4px 10px',
                    background: '#D1FAE5',
                    borderRadius: 6,
                    border: '1px solid #A7F3D0',
                    cursor: 'pointer',
                  }}
                >
                  🎙 Prehrať nahrávku
                </button>
              )}
            </div>
          )}
        </div>
      )
    }

    // type === 'email'
    if (entry.type === 'email') {
      return (
        <div
          style={{
            background: bubbleBg,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: '#1D4ED8', marginBottom: 4 }}>
            {entry.email_subject || 'Email'}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {entry.email_direction === 'outbound' ? 'Komu' : 'Od'}: {entry.email_direction === 'outbound' ? entry.email_to : entry.email_from}
          </div>
        </div>
      )
    }

    // type === 'message'
    return (
      <div
        style={{
          background: bubbleBg,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--dark)',
          lineHeight: 1.5,
        }}
      >
        {entry.message}
      </div>
    )
  }

  const renderEntry = (entry: TimelineEntry) => {
    const avatar = getAvatarStyle(entry)
    const badge = getChannelBadge(entry)
    const author = getAuthorLabel(entry)
    const time = formatTime(entry.created_at)

    return (
      <div
        key={entry.id}
        style={{
          display: 'flex',
          gap: 10,
          padding: '8px 0',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: '50%',
            background: avatar.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {avatar.emoji}
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>{author}</span>
            {badge && (
              <span
                style={{
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  background: badge.bg,
                  color: badge.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {badge.label}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                color: 'var(--g4)',
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {time}
            </span>
          </div>
          {/* Body */}
          {renderEntryBody(entry)}
        </div>
      </div>
    )
  }

  // ---- Channel selector highlight color ----
  const channelBorderColor = (ch: InputChannel): string => {
    switch (ch) {
      case 'note':
        return '#F59E0B'
      case 'tech':
        return '#EA580C'
      case 'client':
        return '#2563EB'
      case 'call':
        return '#059669'
      case 'reminder':
        return '#8B5CF6'
    }
  }

  // ---- Main render ----
  return (
    <div
      style={{
        background: 'var(--w)',
        borderRadius: 10,
        border: '1px solid var(--g7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ===== Header ===== */}
      <div style={{ padding: '14px 16px 0 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>
            {'\uD83D\uDCDC'} Timeline
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: 'var(--g8)',
              color: 'var(--g4)',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {jobRef}
          </span>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: 'var(--g9)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--w)' : 'transparent',
                  color: isActive ? 'var(--dark)' : 'var(--g4)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Input bar (sticky) ===== */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--w)',
          borderBottom: '1px solid var(--g8)',
          padding: '10px 16px',
        }}
      >
        {/* Text input with integrated channel selector */}
        <div style={{
          border: `2px solid ${channelBorderColor(inputChannel)}`,
          borderRadius: 10,
          overflow: 'hidden',
          transition: 'border-color 0.15s ease',
        }}>
          {/* Channel tabs inside the input box */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--g8)',
            background: 'var(--g9)',
          }}>
            {CHANNEL_BUTTONS.map((ch) => {
              const isActive = inputChannel === ch.key
              return (
                <button
                  key={ch.key}
                  onClick={() => setInputChannel(ch.key)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${channelBorderColor(ch.key)}` : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    background: isActive ? 'var(--w)' : 'transparent',
                    color: isActive ? 'var(--dark)' : 'var(--g4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {ch.icon} {ch.label}
                </button>
              )
            })}
          </div>
          {/* Input row */}
          {inputChannel === 'reminder' ? (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={200}
                placeholder="Názov pripomienky..."
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--g7)',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none',
                  background: 'var(--w)',
                  color: 'var(--dark)',
                }}
                disabled={sending}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                />
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  style={{
                    width: 100,
                    padding: '6px 8px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !inputText.trim() || !reminderDate || !reminderTime}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: sending || !inputText.trim() || !reminderDate || !reminderTime ? '#D1D5DB' : '#8B5CF6',
                    color: sending || !inputText.trim() || !reminderDate || !reminderTime ? '#6B7280' : '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: sending || !inputText.trim() || !reminderDate || !reminderTime ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sending ? '...' : 'Vytvoriť'}
                </button>
              </div>
            </div>
          ) : inputChannel === 'call' ? (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={callDirection}
                  onChange={(e) => setCallDirection(e.target.value as 'inbound' | 'outbound')}
                  style={{
                    minWidth: 130,
                    padding: '8px 10px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                >
                  <option value="outbound">Odchádzajúci</option>
                  <option value="inbound">Prichádzajúci</option>
                </select>
                <select
                  value={callCallerType}
                  onChange={(e) => setCallCallerType(e.target.value as 'client' | 'technician' | 'unknown')}
                  style={{
                    minWidth: 120,
                    padding: '8px 10px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                >
                  <option value="client">👤 Zákazník</option>
                  <option value="technician">👷 Technik</option>
                  <option value="unknown">❓ Neznámy</option>
                </select>
                <input
                  type="text"
                  value={callPhone}
                  onChange={(e) => setCallPhone(e.target.value)}
                  placeholder="Telefón"
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: '8px 10px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                />
                <input
                  type="number"
                  min={0}
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="Trvanie (s)"
                  style={{
                    width: 130,
                    padding: '8px 10px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 12,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                  }}
                  disabled={sending}
                />
              </div>
              <input
                type="text"
                value={callSummary}
                onChange={(e) => setCallSummary(e.target.value)}
                maxLength={300}
                placeholder={`Zhrnutie hovoru${currentUserName ? ` (${currentUserName})` : ''}...`}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--g7)',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none',
                  background: 'var(--w)',
                  color: 'var(--dark)',
                }}
                disabled={sending}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <textarea
                  value={callTranscript}
                  onChange={(e) => setCallTranscript(e.target.value)}
                  placeholder="Prepis hovoru alebo najdôležitejšie vety klienta..."
                  style={{
                    flex: 1,
                    minHeight: 88,
                    resize: 'vertical',
                    padding: '8px 10px',
                    border: '1px solid var(--g7)',
                    borderRadius: 6,
                    fontSize: 13,
                    outline: 'none',
                    background: 'var(--w)',
                    color: 'var(--dark)',
                    fontFamily: 'inherit',
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || (!callSummary.trim() && !callTranscript.trim())}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: sending || (!callSummary.trim() && !callTranscript.trim()) ? '#D1D5DB' : '#059669',
                    color: sending || (!callSummary.trim() && !callTranscript.trim()) ? '#6B7280' : '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: sending || (!callSummary.trim() && !callTranscript.trim()) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sending ? '...' : 'Uložiť hovor'}
                </button>
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={
              inputChannel === 'note'
                  ? 'Napísať poznámku... (Enter = odoslať)'
                  : inputChannel === 'tech'
                    ? 'Napísať technikovi... (Enter = odoslať)'
                    : 'Napísať klientovi... (Enter = odoslať)'
              }
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                fontSize: 13,
                outline: 'none',
                background: 'var(--w)',
                color: 'var(--dark)',
              }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !inputText.trim()}
              style={{
                padding: '8px 14px',
                margin: '4px 4px 4px 0',
                borderRadius: 8,
                border: 'none',
                background: sending || !inputText.trim() ? '#D1D5DB' : 'var(--gold)',
                color: sending || !inputText.trim() ? '#6B7280' : '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: sending || !inputText.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {sending ? '...' : 'Odoslať'}
            </button>
          </div>
          )}
        </div>
        {inputText.length > MAX_MESSAGE_LENGTH - 200 && (
          <div
            style={{
              fontSize: 10,
              color: inputText.length >= MAX_MESSAGE_LENGTH ? 'var(--danger)' : 'var(--g4)',
              textAlign: 'right',
              marginTop: 4,
            }}
          >
            {inputText.length}/{MAX_MESSAGE_LENGTH}
          </div>
        )}
      </div>

      {/* ===== Error banner ===== */}
      {error && (
        <div
          style={{
            margin: '8px 16px 0 16px',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#FEF2F2',
            color: '#991B1B',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#991B1B',
              fontWeight: 700,
              fontSize: 14,
              padding: '0 4px',
            }}
          >
            {'\u00D7'}
          </button>
        </div>
      )}

      {/* ===== Timeline feed ===== */}
      <div
        ref={feedRef}
        style={{
          maxHeight: 600,
          overflowY: 'auto',
          padding: '0 16px 16px 16px',
        }}
      >
        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              fontSize: 13,
              color: 'var(--g4)',
            }}
          >
            Načítavam timeline...
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCDC'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
              Zatiaľ žiadne záznamy
            </div>
            <div style={{ fontSize: 12, color: 'var(--g4)' }}>
              Napíšte poznámku, správu technikovi alebo klientovi
              alebo uložte telefonát
            </div>
          </div>
        )}

        {/* No results for filter */}
        {!loading && entries.length > 0 && filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              fontSize: 13,
              color: 'var(--g4)',
            }}
          >
            Žiadne záznamy pre zvolený filter
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Pinned notes (always on top, only in "all" view) */}
            {filter === 'all' && pinnedNotes.length > 0 && (
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                {pinnedNotes.map((entry) => renderEntry(entry))}
              </div>
            )}

            {/* Date groups */}
            {grouped.map((group) => (
              <div key={group.dateKey}>
                {/* Date divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    margin: '16px 0 8px 0',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'var(--g8)' }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--g4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.dateLabel}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--g8)' }} />
                </div>

                {/* Entries */}
                {group.items.map((entry) => renderEntry(entry))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
