export function normalizePhoneForDial(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(/[^+\d]/g, '')
  return normalized || null
}

export function toTelHref(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForDial(phone)
  return normalized ? `tel:${normalized}` : null
}
