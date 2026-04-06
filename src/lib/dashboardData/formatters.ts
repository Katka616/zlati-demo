// Pure utility functions — no async, no DB, no external imports

export function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString('cs-CZ')}\u00a0Kč`
}

export function formatRelativeDate(dateLike: string | Date | null | undefined): string {
  if (!dateLike) return ''
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  if (Number.isNaN(date.getTime())) return ''
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes >= 0 ? `pred ${diffMinutes} min` : `o ${Math.abs(diffMinutes)} min`
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return diffHours >= 0 ? `pred ${diffHours} h` : `o ${Math.abs(diffHours)} h`
  }
  const diffDays = Math.round(diffHours / 24)
  return diffDays >= 0 ? `pred ${diffDays} d` : `o ${Math.abs(diffDays)} d`
}

export function isSameLocalDate(dateLike: string | Date | null | undefined): boolean {
  if (!dateLike) return false
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

export function decodeMultiSelect(encoded: string): string[] {
  if (!encoded) return []
  return encoded.split(',').map(value => value.trim()).filter(Boolean)
}

export function decodeDateRange(encoded: string): { dateField: string; from?: string; to?: string } | null {
  const [dateField, from, to] = encoded.split('|')
  if (!dateField || (!from && !to)) return null
  return {
    dateField,
    from: from || undefined,
    to: to || undefined,
  }
}
