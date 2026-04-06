'use client'

/**
 * HintText — inline help text below form fields.
 * Mobile-first, always visible (no hover tooltips).
 * Language of craft, not accounting.
 */
export default function HintText({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{
      fontSize: 11,
      color: 'var(--text-muted, #6B7280)',
      marginTop: 3,
      lineHeight: 1.35,
      letterSpacing: '0.01em',
      fontStyle: 'italic',
    }}>
      {text}
    </div>
  )
}
