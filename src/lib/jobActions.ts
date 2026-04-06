/**
 * jobActions — Client-side API helper for CRM admin job operations.
 *
 * Pattern: React component → jobActions (fetch) → API route → DB
 *
 * Three main capabilities:
 *   saveJobField()     — update a single job field       → PUT /api/admin/jobs/[id]
 *   saveJobChanges()   — update multiple fields at once   → PUT /api/admin/jobs/[id]
 *   changeJobStatus()  — advance CRM step via statusEngine → POST /api/jobs/[id]/status
 */

/* ── Types ──────────────────────────────────── */

export interface SaveResult {
  success: boolean
  error?: string
  job?: Record<string, unknown>
}

export interface StatusChangeResult {
  success: boolean
  error?: string
  message?: string
  overridable?: boolean
  transition?: {
    from: number
    to: number
    dbStatus: string
    portalPhase: string
    techPhase: string | null
  }
  job?: Record<string, unknown>
}

/* ── Shared fetch wrapper ────────────────────── */

async function apiFetch<T = SaveResult>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
        ...data,
      } as T
    }

    return data as T
  } catch (err) {
    console.error(`[jobActions] ${url} failed:`, err)
    return {
      success: false,
      error: 'network_error',
    } as T
  }
}

/* ── Single Field Save ──────────────────────── */

export async function saveJobField(
  jobId: number,
  field: string,
  value: unknown,
): Promise<SaveResult> {
  return apiFetch<SaveResult>(`/api/admin/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify({ [field]: value }),
  })
}

/* ── Multi-Field Save ───────────────────────── */

export async function saveJobChanges(
  jobId: number,
  changes: Record<string, unknown>,
): Promise<SaveResult> {
  return apiFetch<SaveResult>(`/api/admin/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  })
}

/* ── CRM Step Change (via Status Engine) ────── */

export async function changeJobStatus(
  jobId: number,
  crmStep: number,
  techPhase?: string,
  overrideReason?: string,
): Promise<StatusChangeResult> {
  return apiFetch<StatusChangeResult>(`/api/jobs/${jobId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      crmStep,
      ...(techPhase ? { techPhase } : {}),
      ...(overrideReason ? { override_reason: overrideReason } : {}),
    }),
  })
}

/* ── Fetch Full Job Detail ──────────────────── */

export interface AdminJobDetail {
  success: boolean
  source?: 'dev'
  error?: string
  job: Record<string, unknown> | null
  status?: {
    crmStep: number
    crmStepKey: string
    dbStatus: string
    portalPhase: string
    techPhase: string | null
    checklist: Array<{ id: string; label: string; completed: boolean }>
    progressPercent: number
    nextSteps: number[]
  }
  technician?: {
    id: number
    name: string
    phone: string
    specializations: string[]
    country: string
  } | null
  assignedOperator?: { id: number; name: string; phone: string } | null
  matchDistance?: number | null
  wave_summary?: {
    waves: { waveIndex: number; notified: number; seen: number; declined: number; accepted: number; firstNotifiedAt: string | null; lastResponseAt: string | null }[]
    totalNotified: number
    totalSeen: number
    totalDeclined: number
    totalAccepted: number
    currentWave: number | null
    scheduledAt: string | null
    processedAt: string | null
  } | null
  messages?: Array<{
    id: number
    from: string
    message: string
    source: string
    created_at: string
  }>
}

export async function fetchJobDetail(jobId: number): Promise<AdminJobDetail> {
  return apiFetch<AdminJobDetail>(`/api/admin/jobs/${jobId}`, {
    method: 'GET',
  })
}
