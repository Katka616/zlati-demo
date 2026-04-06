/**
 * Operator notification service.
 *
 * Sends push + in-app notifications to all active operators
 * when key CRM events happen (new job, estimate, protocol, chat, etc.)
 *
 * Fire-and-forget — never blocks API response.
 */

import {
  getAllActiveOperatorSubscriptions,
  getOperatorPushSubscriptions,
  insertOperatorNotification,
  getOperatorNotificationPreferences,
  query,
} from '@/lib/db'
import { getTranslation } from '@/lib/i18n'
import type { Language } from '@/types/protocol'

/** Default language for server-side notifications (company operates in CZ). */
const DEFAULT_LANG: Language = 'cz'

/** Dedup window: don't send same notification type for same job within N minutes */
const OPERATOR_DEDUP_MINUTES = 5

type OperatorEventType =
  | 'new_job'
  | 'estimate_submitted'
  | 'protocol_signed'
  | 'chat_message'
  | 'chat_handoff'
  | 'surcharge_response'
  | 'status_change'
  | 'sla_warning'
  | 'pricing_failed'
  | 'auto_notify_exhausted'

interface OperatorEvent {
  type: OperatorEventType
  title: string
  message: string
  jobId?: number
  link?: string
  /** Skip dedup check — always deliver this notification. Used for client chat messages. */
  skipDedup?: boolean
}

/**
 * Notify all operators about a CRM event.
 * Fire-and-forget — catches all errors internally.
 */
export async function notifyOperators(event: OperatorEvent): Promise<void> {
  try {
    // Get all operators with active push subscriptions
    const operatorPhones = await getAllActiveOperatorSubscriptions()

    if (operatorPhones.length === 0) return

    await notifySpecificOperators(operatorPhones, event)
  } catch (err) {
    console.error('[operatorNotify] Top-level error:', err)
  }
}

export async function notifySpecificOperators(phones: string[], event: OperatorEvent): Promise<void> {
  try {
    if (phones.length === 0) return

    // Dedup: check if this exact notification type+job was already sent recently
    // This prevents duplicates from parallel cron runs or repeated fire-and-forget calls.
    // skipDedup: client chat messages always create in-app record (operator must see every message).
    if (event.jobId && !event.skipDedup) {
      try {
        const existing = await query(
          `SELECT 1 FROM operator_notifications
           WHERE type = $1 AND job_id = $2
             AND created_at > NOW() - INTERVAL '${OPERATOR_DEDUP_MINUTES} minutes'
           LIMIT 1`,
          [event.type, event.jobId]
        )
        if (existing.rows.length > 0) {
          console.log(`[operatorNotify] Dedup: skipping ${event.type} for job ${event.jobId} (sent <${OPERATOR_DEDUP_MINUTES}min ago)`)
          return
        }
      } catch (dedupErr) {
        // Fail open — if dedup check fails, still send the notification
        console.error('[operatorNotify] Dedup check failed:', dedupErr)
      }
    }

    // Process each operator
    await Promise.allSettled(
      phones.map(async (phone) => {
        try {
          // Check preferences
          const prefs = await getOperatorNotificationPreferences(phone)

          // Check if this event type is enabled for this operator
          const prefKey = event.type as keyof typeof prefs
          if (prefKey in prefs && prefs[prefKey] === false) return

          // Create in-app notification
          await insertOperatorNotification({
            operatorPhone: phone,
            title: event.title,
            message: event.message,
            type: event.type,
            jobId: event.jobId ?? null,
            link: event.link ?? null,
          })

          // Send push notification to all devices
          if (prefs.push_enabled !== false) {
            await sendOperatorPush(phone, event)
          }
        } catch (err) {
          console.error(`[operatorNotify] Error for ${phone}:`, err)
        }
      })
    )
  } catch (err) {
    console.error('[operatorNotify] notifySpecificOperators error:', err)
  }
}

/**
 * Send push notification to all of an operator's registered devices.
 */
async function sendOperatorPush(phone: string, event: OperatorEvent): Promise<void> {
  try {
    const subscriptions = await getOperatorPushSubscriptions(phone)
    if (subscriptions.length === 0) return

    // Import web-push dynamically to avoid bundling issues
    const webpush = await import('web-push')

    const vapidPublic = process.env.VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@zlati-remeslnici.com'

    if (!vapidPublic || !vapidPrivate) {
      console.warn('[operatorNotify] VAPID keys not configured, skipping push')
      return
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const payload = JSON.stringify({
      title: event.title,
      body: event.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: `operator-${event.type}-${event.jobId || 'general'}`,
      data: {
        url: event.link || '/admin',
        type: event.type,
        jobId: event.jobId,
      },
    })

    await Promise.allSettled(
      subscriptions.map(async (sub: { push_endpoint: string; push_p256dh: string; push_auth: string }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.push_endpoint,
              keys: {
                p256dh: sub.push_p256dh,
                auth: sub.push_auth,
              },
            },
            payload
          )
        } catch (err: unknown) {
          const pushErr = err as { statusCode?: number }
          // 410 Gone or 404 = subscription expired, deactivate
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            const { deactivateOperatorPushSubscription } = await import('@/lib/db')
            await deactivateOperatorPushSubscription(phone, sub.push_endpoint)
          }
        }
      })
    )
  } catch (err) {
    console.error('[operatorNotify] Push error:', err)
  }
}

// ── Helper: Build event objects for common CRM events ──────────────

export function buildNewJobEvent(job: { id: number; reference_number: string; customer_city?: string; category?: string }, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  const city = job.customer_city || ''
  const cat = job.category || ''
  return {
    type: 'new_job',
    title: t('notifications.eventNewJob'),
    message: `${job.reference_number} — ${city}${cat ? ', ' + cat : ''}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildEstimateEvent(job: { id: number; reference_number: string }, amount: string | number, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'estimate_submitted',
    title: t('notifications.eventEstimateTitle'),
    message: `${amount} Kč — ${job.reference_number}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildProtocolEvent(job: { id: number; reference_number: string }, techName: string, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'protocol_signed',
    title: t('notifications.eventProtocolTitle'),
    message: `${job.reference_number}, ${techName}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildChatEvent(job: { id: number; reference_number: string }, fromName: string, preview: string, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'chat_message',
    title: `${t('notifications.eventChatTitle')} ${fromName}`,
    message: `"${preview.slice(0, 80)}${preview.length > 80 ? '...' : ''}"`,
    jobId: job.id,
    link: `/admin/chat?jobId=${job.id}`,
    // Client chat messages must ALWAYS notify — no dedup. Operator needs to see every message.
    skipDedup: true,
  }
}

export function buildChatHandoffEvent(
  job: { id: number; reference_number: string },
  summary: string,
  reasonCode: string,
  urgency: 'critical' | 'high' | 'normal',
  lang: Language = DEFAULT_LANG
): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)

  return {
    type: 'chat_handoff',
    title: `${t('notifications.eventChatHandoffTitle')} ${job.reference_number}`,
    message: `${reasonCode}${urgency !== 'normal' ? ` · ${urgency}` : ''} · ${summary.slice(0, 110)}${summary.length > 110 ? '...' : ''}`,
    jobId: job.id,
    link: `/admin/chat?jobId=${job.id}`,
  }
}

export function buildSurchargeEvent(job: { id: number; reference_number: string }, approved: boolean, amount: string | number, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'surcharge_response',
    title: approved ? t('notifications.eventSurchargeApproved') : t('notifications.eventSurchargeDeclined'),
    message: `${amount} Kč — ${job.reference_number}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildSlaWarningEvent(job: { id: number; reference_number: string }, minutesOver: number, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'sla_warning',
    title: t('notifications.eventSlaTitle'),
    message: `${job.reference_number} — ${minutesOver} min ${t('notifications.eventSlaMessage')}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildStatusChangeEvent(job: { id: number; reference_number: string }, newStatus: string, lang: Language = DEFAULT_LANG): OperatorEvent {
  const t = (key: string) => getTranslation(lang, key)
  return {
    type: 'status_change',
    title: t('notifications.eventStatusTitle'),
    message: `${job.reference_number} → ${newStatus}`,
    jobId: job.id,
    link: `/admin/jobs?highlight=${job.id}`,
  }
}

export function buildAutoNotifyExhaustedEvent(
  job: { id: number; reference_number: string; category?: string; customer_city?: string },
  wavesRun: number
): OperatorEvent {
  return {
    type: 'auto_notify_exhausted' as OperatorEventType,
    title: '⚠️ Žiadny technik neprijal zákazku',
    message: `${job.reference_number} — ${job.category || ''} v ${job.customer_city || '?'}, ${wavesRun} vĺn bez prijatia`,
    jobId: job.id,
    link: `/admin/jobs/${job.id}`,
  }
}

/**
 * Missed voicebot call — caller hung up before identifying their job,
 * or the caller was completely unknown. Operator needs to follow up.
 */
export function buildMissedVoicebotCallEvent(opts: {
  phone: string
  callerType: 'known_client' | 'unknown'
  jobId?: number
  referenceNumber?: string
  duration?: number
}): OperatorEvent {
  const phoneShort = opts.phone ? opts.phone.slice(-4) : '????'
  const durationStr = opts.duration ? ` (${Math.round(opts.duration / 60)}min)` : ''

  const title = opts.callerType === 'known_client'
    ? `📞 Zákazník zavesil pred výberom zákazky${durationStr}`
    : `📞 Neznámy volajúci zavesil${durationStr}`

  const message = opts.callerType === 'known_client'
    ? `Číslo ...${phoneShort} — zavesil skôr, ako povedal o ktorú zákazku ide. Skontroluj jeho zákazky.`
    : `Číslo ...${phoneShort} — nie je v systéme. Možno nový zákazník.`

  return {
    type: 'status_change',
    title,
    message,
    jobId: opts.jobId,
    link: opts.jobId ? `/admin/jobs/${opts.jobId}` : `/admin/jobs`,
  }
}
