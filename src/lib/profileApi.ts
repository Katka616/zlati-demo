/**
 * Client-side helper for saving technician profile sections.
 * Calls POST /api/dispatch/profile with { section, data }.
 */

export async function saveProfileSection(
  section: string,
  data: unknown
): Promise<{ success: boolean; message?: string; dbSynced?: boolean }> {
  try {
    const res = await fetch('/api/dispatch/profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data }),
    })

    const result = await res.json()

    if (!result.success) {
      console.error(`[Profile] Failed to save ${section}:`, result.error)
    }

    return result
  } catch (err) {
    console.error(`[Profile] Network error saving ${section}:`, err)
    return { success: false, message: 'network_error' }
  }
}
