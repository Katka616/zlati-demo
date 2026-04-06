'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DBJobNote } from '@/lib/db'
import ConfirmDialog from '@/components/dispatch/ConfirmDialog'

interface JobNotesProps {
  jobId: number
  /** Phone of the currently logged-in operator — controls edit/delete visibility */
  currentUserPhone: string
  currentUserName?: string
}

export default function JobNotes({ jobId, currentUserPhone, currentUserName }: JobNotesProps) {
  const [notes, setNotes] = useState<DBJobNote[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes ?? [])
      }
    } catch (err) {
      console.warn('[JobNotes] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleAdd = async () => {
    const content = newContent.trim()
    if (!content) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Chyba pri ukladaní')
        return
      }
      setNotes(prev => [data.note, ...prev])
      setNewContent('')
    } catch {
      setError('Chyba siete — skúste znova')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (noteId: number) => {
    const content = editContent.trim()
    if (!content) return
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Chyba pri úprave')
        return
      }
      setNotes(prev => prev.map(n => n.id === noteId ? data.note : n))
      setEditingId(null)
    } catch {
      setError('Chyba siete — skúste znova')
    }
  }

  const handleTogglePin = async (noteId: number) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pin' }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotes(prev => {
          const updated = prev.map(n => n.id === noteId ? data.note : n)
          return [...updated].sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        })
      }
    } catch (err) {
      console.error('[JobNotes] Update failed:', err)
    }
  }

  const handleDelete = async (noteId: number) => {
    setConfirmDeleteId(noteId)
  }

  const confirmDelete = async (noteId: number) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId))
      } else {
        const data = await res.json()
        setError(data.error ?? 'Chyba pri mazaní')
      }
    } catch {
      setError('Chyba siete — skúste znova')
    }
  }

  const startEdit = (note: DBJobNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'práve teraz'
    if (diffMins < 60) return `pred ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `pred ${diffHours} hod`
    return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const pinnedNotes = notes.filter(n => n.is_pinned)
  const regularNotes = notes.filter(n => !n.is_pinned)

  return (
    <div className="job-notes">
      {/* Add note */}
      <div className="job-notes-add">
        <textarea
          ref={textareaRef}
          className="job-notes-input"
          placeholder="Pridať internú poznámku..."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
          rows={2}
          maxLength={2000}
          disabled={submitting}
        />
        <div className="job-notes-add-row">
          <span className="job-notes-hint">⌘↵ odoslať</span>
          <button
            className="admin-btn admin-btn-gold admin-btn-sm"
            onClick={handleAdd}
            disabled={submitting || !newContent.trim()}
          >
            {submitting ? 'Ukladám...' : '+ Pridať'}
          </button>
        </div>
        {error && <div className="job-notes-error">{error}</div>}
      </div>

      {loading && <div className="job-notes-loading">Načítavam...</div>}

      {!loading && notes.length === 0 && (
        <div className="job-notes-empty">Zatiaľ žiadne poznámky</div>
      )}

      {/* Pinned */}
      {pinnedNotes.length > 0 && (
        <div className="job-notes-group">
          <div className="job-notes-group-label">📌 Pripnuté</div>
          {pinnedNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isOwner={note.author_phone === currentUserPhone}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              onStartEdit={startEdit}
              onEdit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      {/* Regular */}
      {regularNotes.length > 0 && (
        <div className="job-notes-group">
          {pinnedNotes.length > 0 && <div className="job-notes-group-label">Ostatné</div>}
          {regularNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isOwner={note.author_phone === currentUserPhone}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              onStartEdit={startEdit}
              onEdit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Zmazať poznámku"
        message="Naozaj chcete zmazať túto poznámku?"
        confirmLabel="Zmazať"
        cancelLabel="Zrušiť"
        danger
        onConfirm={() => { if (confirmDeleteId !== null) confirmDelete(confirmDeleteId) }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ─── NoteCard sub-component ───────────────────────

interface NoteCardProps {
  note: DBJobNote
  isOwner: boolean
  editingId: number | null
  editContent: string
  setEditContent: (v: string) => void
  onStartEdit: (note: DBJobNote) => void
  onEdit: (id: number) => void
  onCancelEdit: () => void
  onTogglePin: (id: number) => void
  onDelete: (id: number) => void
  formatTime: (iso: string) => string
}

function NoteCard({
  note,
  isOwner,
  editingId,
  editContent,
  setEditContent,
  onStartEdit,
  onEdit,
  onCancelEdit,
  onTogglePin,
  onDelete,
  formatTime,
}: NoteCardProps) {
  const isEditing = editingId === note.id

  return (
    <div className={`job-note-card${note.is_pinned ? ' pinned' : ''}`}>
      <div className="job-note-meta">
        <span className="job-note-author">{note.author_name || note.author_phone}</span>
        <span className="job-note-time">{formatTime(note.created_at)}</span>
        {note.created_at !== note.updated_at && (
          <span className="job-note-edited">upravené</span>
        )}
      </div>

      {isEditing ? (
        <div className="job-note-edit">
          <textarea
            className="job-notes-input"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={3}
            maxLength={2000}
            autoFocus
          />
          <div className="job-note-edit-row">
            <button
              className="admin-btn admin-btn-sm admin-btn-gold"
              onClick={() => onEdit(note.id)}
              disabled={!editContent.trim()}
            >
              Uložiť
            </button>
            <button
              className="admin-btn admin-btn-sm admin-btn-outline"
              onClick={onCancelEdit}
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <div className="job-note-content">{note.content}</div>
      )}

      <div className="job-note-actions">
        <button
          className={`job-note-action-btn${note.is_pinned ? ' active' : ''}`}
          onClick={() => onTogglePin(note.id)}
          title={note.is_pinned ? 'Odopnúť' : 'Pripnúť'}
        >
          📌
        </button>
        {isOwner && !isEditing && (
          <>
            <button
              className="job-note-action-btn"
              onClick={() => onStartEdit(note)}
              title="Upraviť"
            >
              ✏️
            </button>
            <button
              className="job-note-action-btn danger"
              onClick={() => onDelete(note.id)}
              title="Zmazať"
            >
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  )
}
