'use client';

/**
 * Skeleton loading card — shows shimmer animation while content loads.
 * Variants: 'job-card' | 'notification' | 'technician'
 */
export function SkeletonCard({ variant = 'job-card' }: { variant?: 'job-card' | 'notification' | 'technician' }) {
  if (variant === 'notification') {
    return (
      <div style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '40%', marginBottom: 8 }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '90%', marginBottom: 6 }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '60%' }} />
      </div>
    );
  }

  if (variant === 'technician') {
    return (
      <div style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <div className="skeleton-shimmer skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-shimmer skeleton-line" style={{ width: '60%', marginBottom: 8 }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '40%', height: 10 }} />
        </div>
      </div>
    );
  }

  // Default: job-card
  return (
    <div style={{
      padding: '16px',
      borderRadius: 'var(--radius)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '30%' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '20%' }} />
      </div>
      <div className="skeleton-shimmer skeleton-line" style={{ width: '55%', height: 18, marginBottom: 8 }} />
      <div className="skeleton-shimmer skeleton-line" style={{ width: '75%', marginBottom: 6 }} />
      <div className="skeleton-shimmer skeleton-line" style={{ width: '45%', marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: 10 }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '30%', height: 10 }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, variant = 'job-card', gap = 12 }: { count?: number; variant?: 'job-card' | 'notification' | 'technician'; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
