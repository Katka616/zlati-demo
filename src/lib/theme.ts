import type { CSSProperties } from 'react'

/* ── Semantic style helpers ──
 * Return CSS-var-based inline styles for common patterns.
 * No JS theme detection — CSS custom properties handle dark/light.
 */

export function cardStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    ...extra,
  }
}

export function inputStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--input-text)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: 15,
    ...extra,
  }
}

export function btnPrimary(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--gold)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    ...extra,
  }
}

export function btnSecondary(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--btn-secondary-bg)',
    color: 'var(--btn-secondary-text)',
    border: '1px solid var(--btn-secondary-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    ...extra,
  }
}

export function btnOutline(extra?: CSSProperties): CSSProperties {
  return {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--btn-outline-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    ...extra,
  }
}

export function btnDanger(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    ...extra,
  }
}

type StateType = 'info' | 'warning' | 'danger' | 'success'

export function stateBanner(type: StateType, extra?: CSSProperties): CSSProperties {
  return {
    background: `var(--${type}-bg)`,
    color: `var(--${type}-text)`,
    border: `1px solid var(--${type}-border)`,
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    fontSize: 14,
    ...extra,
  }
}
