/**
 * date-utils.ts — pomocné funkcie pre prácu s časom v celej appke.
 *
 * Koreňový problém: node-postgres vracia timestamp stĺpce ako JS Date objekty,
 * ktoré Next.js serializuje do JSON ako napr. "2026-03-17T14:30:00.000Z" (správne UTC).
 * Avšak niektoré query funkcie vracajú raw stringy z to_char() bez timezone info,
 * napr. "2026-03-17 14:30:00" — tie treba explicitne parsovať ako UTC.
 *
 * Toto riešenie: `parseDbDate(str)` vždy vráti správny Date objekt v UTC,
 * ktorý browser automaticky zobrazí v lokálnom čase operátora/technika.
 */

/**
 * Parsuje DB timestamp string ako UTC Date.
 * Bezpečné pre oba formáty:
 *   "2026-03-17T14:30:00.000Z"  (node-postgres JSON serializácia — má Z)
 *   "2026-03-17 14:30:00"       (raw to_char() výstup — bez Z)
 */
export function parseDbDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  // Ak chýba timezone info, doplníme Z aby sa parsoval ako UTC
  const normalized = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)
    ? iso
    : iso.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formátuje DB timestamp ako "HH:MM" v lokálnom čase.
 */
export function formatDbTime(iso: string | null | undefined): string {
  const d = parseDbDate(iso)
  if (!d) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Formátuje DB timestamp ako "DD.MM.YYYY" v lokálnom čase.
 */
export function formatDbDate(iso: string | null | undefined): string {
  const d = parseDbDate(iso)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/**
 * Formátuje DB timestamp ako "DD.MM.YYYY HH:MM" v lokálnom čase.
 */
export function formatDbDateTime(iso: string | null | undefined): string {
  const d = parseDbDate(iso)
  if (!d) return ''
  return `${formatDbDate(iso)} ${formatDbTime(iso)}`
}

/**
 * Relatívny čas: "práve teraz", "pred 5 min", "pred 2 hod", "pred 3 d"
 */
export function timeAgoFromDb(iso: string | null | undefined): string {
  const d = parseDbDate(iso)
  if (!d) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'práve teraz'
  if (mins < 60) return `pred ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `pred ${hrs} hod`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `pred ${days} dňami`
  return formatDbDate(iso)
}

/**
 * Farba podľa veku: zelená (<4h), žltá (4-24h), červená (>24h).
 * Používa sa v job detail headeri pre vizuálny SLA indikátor.
 */
export function getAgeColor(iso: string | null | undefined): string {
  const d = parseDbDate(iso)
  if (!d) return '#6B7280'
  const hours = (Date.now() - d.getTime()) / 3600000
  if (hours < 4) return '#059669'
  if (hours < 24) return '#D97706'
  return '#DC2626'
}
