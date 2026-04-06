/**
 * orderEmail.ts — Send job order email to technician after assignment.
 *
 * Triggered from:
 *  - POST /api/jobs/[id]/assign (manual assignment)
 *  - POST /api/marketplace/[id]/take (marketplace claim)
 *
 * Fire-and-forget — errors are logged, never thrown to caller.
 */

import { sendEmail } from '@/lib/gmail'
import { getJobById } from '@/lib/db/jobs'
import { query, claimEmailDedup } from '@/lib/db'
import { getCategoryLabelLocalized } from '@/lib/constants'
import { getAppBaseUrl } from '@/lib/env'
import { buildOrderEmailHtml, type OrderEmailData } from '@/lib/orderEmailTemplate'
import { generateBackupProtocolPdf } from '@/lib/backupProtocolPdf'


// ── Main ───────────────────────────────────────────────────────────

interface TechRow {
  id: number
  first_name: string
  last_name: string
  email: string | null
  country: string
}

export async function sendOrderEmail(jobId: number, technicianId: number): Promise<void> {
  // 0. Atomic dedup — only first caller wins
  const claimed = await claimEmailDedup(jobId, 'order_email_sent_at')
  if (!claimed) {
    console.log(`[OrderEmail] Order email already sent for job ${jobId} — skipping`)
    return
  }

  // 1. Fetch job
  const job = await getJobById(jobId)
  if (!job) {
    console.error(`[OrderEmail] Job ${jobId} not found`)
    return
  }

  // 2. Fetch technician
  const techResult = await query<TechRow>(
    'SELECT id, first_name, last_name, email, country FROM technicians WHERE id = $1',
    [technicianId]
  )
  const tech = techResult.rows?.[0]
  if (!tech) {
    console.error(`[OrderEmail] Technician ${technicianId} not found`)
    return
  }

  if (!tech.email) {
    console.warn(`[OrderEmail] Technician ${technicianId} (${tech.first_name} ${tech.last_name}) has no email — skipping`)
    return
  }

  // 3. Determine locale from technician's country
  const locale: 'cs' | 'sk' = tech.country === 'SK' ? 'sk' : 'cs'
  const langForLabels: 'sk' | 'cz' = tech.country === 'SK' ? 'sk' : 'cz'

  // 4. Build template data
  const appUrl = getAppBaseUrl()
  const categoryLabel = getCategoryLabelLocalized(job.category || '', langForLabels)
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const proposed = cf.proposed_schedule as { date?: string; time?: string; status?: string } | undefined
  const data: OrderEmailData = {
    jobId: job.id,
    referenceNumber: job.reference_number || `ZR-${job.id}`,
    category: categoryLabel || job.category || '—',
    urgency: job.urgency || 'standard',
    scheduledDate: job.scheduled_date ? new Date(job.scheduled_date).toISOString() : null,
    scheduledTime: job.scheduled_time || null,
    proposedSchedule: proposed?.date
      ? { date: proposed.date, time: proposed.time || '', status: proposed.status || 'pending' }
      : null,
    customerName: job.customer_name || '—',
    customerPhone: job.customer_phone || '—',
    customerAddress: job.customer_address || '—',
    customerCity: job.customer_city || '—',
    customerPsc: job.customer_psc || '—',
    description: job.description || '',
    appUrl,
  }

  // 5. Build HTML
  const html = buildOrderEmailHtml(data, locale)

  // 6. Generate backup protocol PDF
  const protocolPdf = await generateBackupProtocolPdf()

  // 7. Build attachments
  const attachments: Array<{ filename: string; content: Buffer | string; mimeType: string }> = [
    {
      filename: 'servisni-protokol-zalozni.pdf',
      content: protocolPdf,
      mimeType: 'application/pdf',
    },
  ]

  // 8. Build subject (both languages use same structure, category is already localized)
  const subject = `Nová objednávka #${data.referenceNumber} — ${data.category}`

  // 9. Send
  await sendEmail({
    to: tech.email,
    subject,
    body: html,
    attachments,
  })

  console.log(`[OrderEmail] Sent order email for job ${jobId} to ${tech.email} (${tech.first_name} ${tech.last_name})`)
}
