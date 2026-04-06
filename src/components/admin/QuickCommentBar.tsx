'use client'

import { useState, useCallback } from 'react'

interface QuickCommentBarProps {
  jobId: number
  onCommentAdded?: () => void
}

export default function QuickCommentBar({ jobId, onCommentAdded }: QuickCommentBarProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: trimmed, is_pinned: false }),
      })

      if (res.ok) {
        setText('')
        onCommentAdded?.()
      }
    } catch (err) {
      console.error('Failed to send comment:', err)
    } finally {
      setSending(false)
    }
  }, [text, jobId, sending, onCommentAdded])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="admin-quick-comment">
      <input
        type="text"
        placeholder="Napísať komentár..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={sending}
        style={{ opacity: sending ? 0.6 : 1 }}
      />
      <button
        className="send-btn"
        onClick={handleSend}
        disabled={!text.trim() || sending}
        style={{ opacity: (!text.trim() || sending) ? 0.5 : 1 }}
        aria-label="Odoslať komentár"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m22 2-7 20-4-9-9-4z"/><path d="m22 2-11 11"/>
        </svg>
      </button>
    </div>
  )
}
