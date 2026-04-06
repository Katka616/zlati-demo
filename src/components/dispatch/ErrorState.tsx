'use client'

interface ErrorStateProps {
  message?: string
  lang?: 'sk' | 'cz'
  onRetry?: () => void
  compact?: boolean
}

const DEFAULT_MESSAGES: Record<'sk' | 'cz', string> = {
  sk: 'Nepodarilo sa načítať dáta. Skúste znova.',
  cz: 'Nepodařilo se načíst data. Zkuste znovu.',
}

const RETRY_LABELS: Record<'sk' | 'cz', string> = {
  sk: 'Skúsiť znova',
  cz: 'Zkusit znovu',
}

export default function ErrorState({
  message,
  lang = 'sk',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const displayMessage = message ?? DEFAULT_MESSAGES[lang]
  const retryLabel = RETRY_LABELS[lang]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '8px' : '16px',
        padding: compact ? '16px 12px' : '40px 24px',
        background: 'var(--bg-card)',
        borderRadius: compact ? '8px' : '12px',
        color: 'var(--text-primary)',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: compact ? '32px' : '48px',
          height: compact ? '32px' : '48px',
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width={compact ? 18 : 24}
          height={compact ? 18 : 24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--danger)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      {/* Message */}
      <p
        style={{
          margin: 0,
          fontSize: compact ? '13px' : '15px',
          lineHeight: '1.5',
          color: 'var(--text-secondary)',
          maxWidth: '280px',
        }}
      >
        {displayMessage}
      </p>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: compact ? '0' : '4px',
            padding: compact ? '6px 16px' : '10px 24px',
            fontSize: compact ? '13px' : '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'var(--danger)',
            background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            border: '1.5px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.75'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
