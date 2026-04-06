'use client'

import { useState } from 'react'
import { type Job } from '@/data/mockData'
import { useToast } from '@/components/ui/Toast'
import { type PortalTexts } from './portalLocale'

interface Phase6Props {
  job: Job
  t: PortalTexts
  token?: string
  isApiMode?: boolean
}

export function PortalPhase6Rating({ job, t, token, isApiMode }: Phase6Props) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast(t.ratingError)
      return
    }

    if (isApiMode && token) {
      setIsSubmitting(true)
      try {
        const res = await fetch(`/api/portal/${token}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rate',
            stars: rating,
            comment: feedback.trim(),
          }),
        })
        const data = await res.json()
        if (data.success) {
          setSubmitted(true)
          if (navigator.vibrate) navigator.vibrate(50)
          showToast(`${t.ratingThanksTitle} ✅`)
        } else {
          showToast(data.error || t.errorRating)
        }
      } catch (err) {
        showToast(t.errorNetwork)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Mock mode fallback
    setSubmitted(true)
    if (navigator.vibrate) navigator.vibrate(50)
    showToast(`${t.ratingThanksTitle} ✅`)
  }

  if (submitted) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3 style={{ marginBottom: 8 }}>{t.ratingThanksTitle}</h3>
        <div style={{ fontSize: 32, marginBottom: 12 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} style={{ color: i < rating ? 'var(--gold)' : 'var(--g4)' }}>★</span>
          ))}
        </div>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>
          {t.ratingThanksText(job.reference_number)}
        </p>
      </div>
    )
  }

  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">{t.phase6Title}</h2>

      {/* Hviezdičky */}
      <div className="portal-card" style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14, marginBottom: 16 }}>
          {t.ratingQuestion}
        </p>
        <div className="portal-stars">
          {Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1
            const isActive = starValue <= (hoverRating || rating)
            return (
              <button
                key={i}
                type="button"
                className={`portal-star${isActive ? ' active' : ''}`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                onTouchStart={() => setRating(starValue)}
              >
                ★
              </button>
            )
          })}
        </div>
        {rating > 0 && (
          <p style={{ color: 'var(--gold-text, #8B6914)', fontSize: 14, marginTop: 8, fontWeight: 600 }}>
            {t.ratingLabels[rating - 1]}
          </p>
        )}
      </div>

      {/* Feedback */}
      <div className="portal-card">
        <label className="field-label">{t.feedbackLabel}</label>
        <textarea
          className="field-input"
          rows={3}
          placeholder={t.feedbackPlaceholder}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Submit */}
      <button
        className="btn btn-gold btn-full"
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        style={{ opacity: (rating === 0 || isSubmitting) ? 0.5 : 1 }}
      >
        {isSubmitting ? <><span className="portal-btn-spinner" />{t.submitting}</> : t.submitRating}
      </button>
    </div>
  )
}
