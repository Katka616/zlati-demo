/**
 * Public holidays for Czech Republic and Slovak Republic.
 *
 * Pure functions — no external dependencies, no I/O.
 * Easter is computed using the Anonymous Gregorian algorithm (Computus).
 */

// ── Easter calculation ────────────────────────────────────────────────

/**
 * Calculate Easter Sunday date for the given year.
 * Uses the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 * Returns a Date object set to midnight UTC.
 */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 1-based month
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function fixedDate(year: number, month: number, day: number): string {
  // month is 1-based
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Czech Republic ────────────────────────────────────────────────────

/**
 * Returns a Set of "YYYY-MM-DD" strings representing Czech public holidays for the given year.
 *
 * Fixed dates:
 *   1.1  – Nový rok / Den obnovy samostatného českého státu
 *   1.5  – Svátek práce
 *   8.5  – Den vítězství
 *   5.7  – Den slovanských věrozvěstů Cyrila a Metoděje
 *   6.7  – Den upálení mistra Jana Husa
 *   28.9 – Den české státnosti
 *   28.10 – Den vzniku samostatného československého státu
 *   17.11 – Den boje za svobodu a demokracii
 *   24.12 – Štědrý den
 *   25.12 – 1. svátek vánoční
 *   26.12 – 2. svátek vánoční
 *
 * Moveable (Easter-based):
 *   Good Friday   (Easter - 2 days)
 *   Easter Monday (Easter + 1 day)
 */
export function getCzechHolidays(year: number): Set<string> {
  const easter = easterSunday(year)
  const goodFriday = addDays(easter, -2)
  const easterMonday = addDays(easter, 1)

  return new Set([
    fixedDate(year, 1, 1),
    toYYYYMMDD(goodFriday),
    toYYYYMMDD(easterMonday),
    fixedDate(year, 5, 1),
    fixedDate(year, 5, 8),
    fixedDate(year, 7, 5),
    fixedDate(year, 7, 6),
    fixedDate(year, 9, 28),
    fixedDate(year, 10, 28),
    fixedDate(year, 11, 17),
    fixedDate(year, 12, 24),
    fixedDate(year, 12, 25),
    fixedDate(year, 12, 26),
  ])
}

// ── Slovak Republic ───────────────────────────────────────────────────

/**
 * Returns a Set of "YYYY-MM-DD" strings representing Slovak public holidays for the given year.
 *
 * Fixed dates:
 *   1.1  – Deň vzniku Slovenskej republiky
 *   6.1  – Zjavenie Pána / Traja králi
 *   1.5  – Sviatok práce
 *   8.5  – Deň víťazstva nad fašizmom
 *   5.7  – Sviatok sv. Cyrila a Metoda
 *   29.8 – Výročie SNP
 *   1.9  – Deň Ústavy Slovenskej republiky
 *   15.9 – Sedembolestná Panna Mária
 *   1.11 – Sviatok všetkých svätých
 *   17.11 – Deň boja za slobodu a demokraciu
 *   24.12 – Štedrý deň
 *   25.12 – 1. sviatok vianočný
 *   26.12 – 2. sviatok vianočný
 *
 * Moveable (Easter-based):
 *   Good Friday   (Easter - 2 days)
 *   Easter Monday (Easter + 1 day)
 */
export function getSlovakHolidays(year: number): Set<string> {
  const easter = easterSunday(year)
  const goodFriday = addDays(easter, -2)
  const easterMonday = addDays(easter, 1)

  return new Set([
    fixedDate(year, 1, 1),
    fixedDate(year, 1, 6),
    toYYYYMMDD(goodFriday),
    toYYYYMMDD(easterMonday),
    fixedDate(year, 5, 1),
    fixedDate(year, 5, 8),
    fixedDate(year, 7, 5),
    fixedDate(year, 8, 29),
    fixedDate(year, 9, 1),
    fixedDate(year, 9, 15),
    fixedDate(year, 11, 1),
    fixedDate(year, 11, 17),
    fixedDate(year, 12, 24),
    fixedDate(year, 12, 25),
    fixedDate(year, 12, 26),
  ])
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Check whether a given date is a public holiday in the specified country.
 * @param date - Any Date object (only the calendar date portion is used)
 * @param country - 'CZ' or 'SK'
 */
export function isHoliday(date: Date, country: 'CZ' | 'SK'): boolean {
  const dateStr = toYYYYMMDD(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())))
  const year = date.getFullYear()
  const holidays = country === 'CZ' ? getCzechHolidays(year) : getSlovakHolidays(year)
  return holidays.has(dateStr)
}
