/**
 * Unified notification service with Push → WhatsApp → SMS cascade.
 *
 * Cascade logic:
 * 1. Try push notification first (free, instant)
 * 2. If push fails → try WhatsApp (if technician has WA channel)
 * 3. If WA fails → fallback to SMS (guaranteed delivery)
 *
 * Technician's notification_channel preference determines WA vs SMS:
 * - 'sms' (default): push → SMS (no WA)
 * - 'whatsapp': push → WA → SMS fallback
 * - 'auto': push → check WA registered → WA if yes, SMS if no
 */

import { sendPushNotification, PushPayload, NotificationTemplates } from './push'
import { maskPhone } from './sms'
import { isSmsAllowed, getAppBaseUrl } from './env'
import { getCategoryLabelLocalized } from './constants'
import {
  isDatabaseAvailable,
  hasPushToken,
  logNotification,
  memoryHasPushToken,
  isPushRecentlyConfirmed,
} from './db'
import { resolveSmsTemplate } from './smsTemplates'
import { createLogger } from '@/lib/logger'
import { tn, techLangFromCountry, type TechLang } from '@/lib/techNotifications'

const log = createLogger('Notify')

// ── Types ────────────────────────────────────────────────────────────

export interface NotifyResult {
  success: boolean
  method: 'push' | 'whatsapp' | 'sms' | 'none'
  error?: string
}

export type NotificationChannel = 'sms' | 'whatsapp' | 'auto'

export interface NotifyOptions {
  /** Force SMS even if push is available */
  forceSms?: boolean
  /** Skip SMS fallback if push fails */
  pushOnly?: boolean
  /** Skip push, send only SMS */
  smsOnly?: boolean
  /** Smart SMS: send SMS only if push delivery is NOT confirmed recently.
   *  Service worker confirms delivery → updates last_confirmed_at in push_tokens.
   *  If last confirmation > PUSH_STALE_HOURS → push is dead → send SMS. */
  smartSms?: boolean
  /** Technician's notification channel preference (overrides DB lookup) */
  notificationChannel?: NotificationChannel
  /** WhatsApp text (with *bold*, emojis). If not provided, falls back to SMS text. */
  waText?: string
}

// ── Main Notify Function ─────────────────────────────────────────────

/**
 * Send a notification to a technician by phone number.
 *
 * Automatically chooses the best delivery method:
 * 1. Push notification (if available and technician has subscription)
 * 2. SMS fallback (if push fails or unavailable)
 * 3. smartSms mode: push first, then SMS only if push delivery is NOT recently confirmed
 *    (service worker confirms delivery → updates last_confirmed_at in push_tokens)
 *
 * @param phone - The technician's phone number (primary identifier)
 * @param payload - Notification content
 * @param options - Delivery options
 */
export async function notifyTechnician(
  phone: string,
  payload: PushPayload,
  options: NotifyOptions = {}
): Promise<NotifyResult> {
  const { forceSms, pushOnly, smsOnly, smartSms } = options

  const { notificationChannel, waText } = options

  // Option: SMS only
  if (smsOnly || forceSms) {
    return sendSmsNotification(phone, payload)
  }

  // Check if technician has push subscription
  let hasPush
  if (isDatabaseAvailable()) {
    hasPush = await hasPushToken(phone)
  } else {
    hasPush = memoryHasPushToken(phone)
  }

  // smartSms mode: send push, then check if we need SMS based on delivery history
  if (smartSms && hasPush) {
    const pushResult = await sendPushNotification(phone, payload)

    if (pushResult.success) {
      // Push API accepted it (HTTP 201) — but is it actually being delivered?
      // Check if service worker confirmed delivery recently (last 24h)
      let pushConfirmed = false
      if (isDatabaseAvailable()) {
        pushConfirmed = await isPushRecentlyConfirmed(phone, 24)
      }

      if (pushConfirmed) {
        // Push is known to work — no SMS needed
        return { success: true, method: 'push' }
      }

      // Push accepted but no recent delivery confirmation → token might be stale
      // Apple silently drops push to expired tokens (returns 201 but doesn't deliver)
      log.info(`Push accepted but no delivery confirmation for ${maskPhone(phone)} — sending fallback`)
      if (notificationChannel === 'whatsapp' || notificationChannel === 'auto') {
        return sendWithWaFallback(phone, payload, waText)
      }
      return sendSmsNotification(phone, payload)
    }

    // Push API failed → fall back to WA or SMS
    if (!pushOnly) {
      log.info(`Push failed for ${maskPhone(phone)}, sending fallback...`)
      if (notificationChannel === 'whatsapp' || notificationChannel === 'auto') {
        return sendWithWaFallback(phone, payload, waText)
      }
      return sendSmsNotification(phone, payload)
    }
    return { success: false, method: 'push', error: pushResult.error }
  }

  // Try push first (standard mode)
  if (hasPush) {
    const pushResult = await sendPushNotification(phone, payload)

    if (pushResult.success) {
      return { success: true, method: 'push' }
    }

    // Push failed - check if we should fallback to SMS
    if (pushOnly) {
      return { success: false, method: 'push', error: pushResult.error }
    }

    log.info(`Push failed for ${maskPhone(phone)}, trying fallback...`)
  }

  // Fallback: WA or SMS based on notification channel preference
  if (pushOnly) {
    return { success: false, method: 'none', error: 'no_push_subscription' }
  }

  // WhatsApp cascade: if technician prefers WA, try WA first then SMS
  if (notificationChannel === 'whatsapp' || notificationChannel === 'auto') {
    return sendWithWaFallback(phone, payload, waText)
  }

  return sendSmsNotification(phone, payload)
}

/**
 * Send SMS notification (fallback).
 */
async function sendSmsNotification(
  phone: string,
  payload: PushPayload
): Promise<NotifyResult> {
  // Use custom smsText if provided, otherwise fallback to title + body
  const message = payload.smsText || `${payload.title}\n${payload.body}`

  try {
    if (!isSmsAllowed(phone)) {
      log.info(`SMS blocked by whitelist for ${maskPhone(phone)}`)
      return { success: false, method: 'none', error: 'sms_whitelist_blocked' }
    }

    log.info(`Sending SMS to ${maskPhone(phone)}: ${message.substring(0, 50)}...`)

    const { sendSms } = await import('./sms')
    const smsResult = await sendSms(phone, message)

    // Log AFTER sending — capture actual success/failure
    if (isDatabaseAvailable()) {
      await logNotification({
        phone,
        type: 'sms',
        title: payload.title,
        body: payload.body,
        error: smsResult.success ? undefined : (smsResult.error || 'sms_send_failed'),
      })
    }

    if (!smsResult.success) {
      log.error(`SMS delivery failed for ${maskPhone(phone)}: ${smsResult.error}`)
      return { success: false, method: 'sms', error: smsResult.error }
    }

    return { success: true, method: 'sms' }
  } catch (err) {
    const error = err as Error
    log.error(`SMS send failed for ${maskPhone(phone)}: ${error.message}`, undefined, { title: payload.title })
    // Log the thrown error too
    if (isDatabaseAvailable()) {
      await logNotification({
        phone,
        type: 'sms',
        title: payload.title,
        body: payload.body,
        error: error.message,
      }).catch(() => {})
    }
    return { success: false, method: 'sms', error: error.message }
  }
}

// ── WhatsApp Send ───────────────────────────────────────────────────

/**
 * Queue WhatsApp message via wa_outbox table.
 * The WA service worker picks up pending messages and sends them.
 */
async function sendWhatsAppNotification(
  phone: string,
  payload: PushPayload,
  waText?: string
): Promise<NotifyResult> {
  const message = waText || payload.waText || payload.smsText || `${payload.title}\n${payload.body}`

  try {
    if (!isDatabaseAvailable()) {
      return { success: false, method: 'none', error: 'db_unavailable' }
    }

    const { query } = await import('./db')

    // Check if WA worker is alive (heartbeat within last 120s) — if not, skip WA and let cascade fall to SMS
    const heartbeatResult = await query<{ alive: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM wa_service_status WHERE key = 'heartbeat' AND updated_at > NOW() - INTERVAL '120 seconds'
      ) AS alive`
    )
    if (!heartbeatResult.rows[0]?.alive) {
      log.warn(`WhatsApp worker not alive — skipping WA for ${maskPhone(phone)}`)
      return { success: false, method: 'whatsapp', error: 'wa_worker_offline' }
    }

    await query(
      `INSERT INTO wa_outbox (phone, message, message_type, status)
       VALUES ($1, $2, 'notification', 'pending')`,
      [phone, message]
    )

    log.info(`WhatsApp queued for ${maskPhone(phone)}: ${message.substring(0, 50)}...`)

    await logNotification({
      phone,
      type: 'whatsapp' as 'sms',
      title: payload.title,
      body: message,
    })

    return { success: true, method: 'whatsapp' }
  } catch (err) {
    const error = err as Error
    log.error(`WhatsApp queue failed for ${maskPhone(phone)}: ${error.message}`)
    return { success: false, method: 'whatsapp', error: error.message }
  }
}

/**
 * Try WhatsApp first, then SMS fallback.
 */
async function sendWithWaFallback(
  phone: string,
  payload: PushPayload,
  waText?: string
): Promise<NotifyResult> {
  const waResult = await sendWhatsAppNotification(phone, payload, waText)
  if (waResult.success) return waResult

  // WA failed → fallback to SMS
  log.info(`WhatsApp failed for ${maskPhone(phone)}, falling back to SMS...`)
  return sendSmsNotification(phone, payload)
}

// ── Convenience Functions ────────────────────────────────────────────

/**
 * Notify technician about a new job.
 *
 * @param phone - Technician's phone number
 * @param job - Job details
 */
export async function notifyNewJob(
  phone: string,
  job: {
    referenceNumber: string
    city: string
    address?: string
    category: string
    description?: string
    distance?: number
    urgent?: boolean
    lang?: 'sk' | 'cz'
    partnerName?: string
  }
): Promise<NotifyResult> {
  const payload = NotificationTemplates.newJob(job)
  // Critical: always send SMS — Apple silently drops push to stale tokens
  return notifyTechnician(phone, payload, { smartSms: true })
}

/**
 * Notify technician about assigned job.
 *
 * @param phone - Technician's phone number
 * @param job - Job details
 */
export async function notifyJobAssigned(
  phone: string,
  job: {
    referenceNumber: string
    customerName: string
    address: string
    lang?: 'sk' | 'cz'
  }
): Promise<NotifyResult> {
  const payload = NotificationTemplates.jobAssigned(job)
  // Critical: always send SMS — Apple silently drops push to stale tokens
  return notifyTechnician(phone, payload, { smartSms: true })
}

/**
 * Notify technician about new chat message.
 *
 * @param phone - Technician's phone number
 * @param chat - Chat message details
 */
export async function notifyChatMessage(
  phone: string,
  chat: {
    senderName: string
    preview: string
    conversationId: string
    lang?: 'sk' | 'cz'
  }
): Promise<NotifyResult> {
  const payload = NotificationTemplates.chatMessage(chat)
  return notifyTechnician(phone, payload)
}

/**
 * Send test notification to verify push is working.
 * This doesn't fallback to SMS.
 */
export async function sendTestNotification(phone: string): Promise<NotifyResult> {
  const payload = NotificationTemplates.test()
  return notifyTechnician(phone, payload, { pushOnly: true })
}

// ── Client (Customer) SMS Notifications ──────────────────────────────

/**
 * Support phone number for client SMS.
 * Set CLIENT_SUPPORT_PHONE env var in production.
 */
if (!process.env.CLIENT_SUPPORT_PHONE) {
  log.warn('CLIENT_SUPPORT_PHONE not set — using default. Set this env var in production!')
}
const CLIENT_SUPPORT_PHONE = process.env.CLIENT_SUPPORT_PHONE || '+420800123456'

/**
 * Send SMS to client about key portal events.
 * Uses the generic sendSms from sms.ts (Bulkgate API).
 */
export async function notifyClientSms(
  phone: string,
  message: string,
  template: string = 'client_sms',
): Promise<{ success: boolean; error?: string }> {
  try {
    const { sendSms } = await import('./sms')
    const result = await sendSms(phone, message)
    log.info(`ClientSMS sent to ${maskPhone(phone)}: ${message.substring(0, 50)}...`)

    // Log to DB for audit trail
    if (isDatabaseAvailable()) {
      await logNotification({
        phone,
        type: 'sms',
        title: template,
        body: message,
        error: result.success ? undefined : (result.error || 'sms_send_failed'),
      }).catch(err => log.error(`Failed to log notification for ${maskPhone(phone)}`, undefined, err))
    }

    return result
  } catch (err) {
    const error = err as Error
    log.error(`ClientSMS failed for ${maskPhone(phone)}: ${error.message}`)

    // Log failure to DB
    if (isDatabaseAvailable()) {
      await logNotification({
        phone,
        type: 'sms',
        title: template,
        body: message,
        error: error.message,
      }).catch(logErr => log.error(`Failed to log notification error for ${maskPhone(phone)}`, undefined, logErr))
    }

    return { success: false, error: error.message }
  }
}

/**
 * SMS message templates for client portal events.
 * DEPRECATED: Use resolveSmsTemplate() from smsTemplates.ts for DB-backed templates.
 * Kept for backward compatibility — functions below now use resolveSmsTemplate().
 */
export function clientSmsTemplates(portalUrl: string, lang: 'sk' | 'cz' = 'sk') {
  // Legacy wrapper — still works but templates now come from DB via resolveSmsTemplate()
  const t = lang === 'cz' ? {
    jobCreated: (partnerName: string, refNumber: string) =>
      `Zlati Remeslnici (${partnerName}): Prijali jsme vase hlaseni c. ${refNumber}. Vyplnte formular pro rychlejsi vyrizeni: ${portalUrl}`,
    techAssigned: (techName: string) =>
      `Zlati Remeslnici: K vasi zakazce byl prirazen technik ${techName}. Sledujte stav: ${portalUrl}`,
    surchargeNeeded: (amount: string) =>
      `Zlati Remeslnici: K vasi zakazce je potrebny doplatek ${amount}. Rozhodnete prosim zde: ${portalUrl}`,
    protocolReady: () =>
      `Zlati Remeslnici: Protokol o oprave je pripraven. Zkontrolujte a podepiste zde: ${portalUrl}`,
    techEnRoute: (techName: string) =>
      `Zlati Remeslnici: Technik ${techName} je na ceste k vam. Sledujte stav: ${portalUrl}`,
    techReassigned: (newTechName: string) =>
      `Zlati Remeslnici: Doslo ke zmene technika. Novy technik: ${newTechName}. Sledujte stav: ${portalUrl}`,
    multiVisitCompleted: (visitNum: number, nextVisitDate?: string) => {
      const dateText = nextVisitDate
        ? ` Dalsi navsteva: ${nextVisitDate}.`
        : ' Termin dalsi navstevy bude potvrzen.'
      return `Zlati Remeslnici: Navsteva c. ${visitNum} byla dokoncena a protokol podepsan.${dateText} Sledujte stav: ${portalUrl}`
    },
  } : {
    jobCreated: (partnerName: string, refNumber: string) =>
      `Zlati Remeslnici (${partnerName}): Prijali sme vase hlasenie c. ${refNumber}. Vyplnte formular pre rychlejsie vybavenie: ${portalUrl}`,
    techAssigned: (techName: string) =>
      `Zlati Remeslnici: K vasej zakazke bol prideleny technik ${techName}. Sledujte stav: ${portalUrl}`,
    surchargeNeeded: (amount: string) =>
      `Zlati Remeslnici: K vasej zakazke je potrebny doplatok ${amount}. Rozhodnite prosim tu: ${portalUrl}`,
    protocolReady: () =>
      `Zlati Remeslnici: Protokol o oprave je pripraveny. Skontrolujte a podpiste tu: ${portalUrl}`,
    techEnRoute: (techName: string) =>
      `Zlati Remeslnici: Technik ${techName} je na ceste k vam. Sledujte stav: ${portalUrl}`,
    techReassigned: (newTechName: string) =>
      `Zlati Remeslnici: Doslo k zmene technika. Novy technik: ${newTechName}. Sledujte stav: ${portalUrl}`,
    multiVisitCompleted: (visitNum: number, nextVisitDate?: string) => {
      const dateText = nextVisitDate
        ? ` Dalsia navsteva: ${nextVisitDate}.`
        : ' Termin dalsej navstevy bude potvrdeny.'
      return `Zlati Remeslnici: Navsteva c. ${visitNum} bola dokoncena a protokol podpisany.${dateText} Sledujte stav: ${portalUrl}`
    },
  }
  return t
}

/**
 * SMS message templates for technician reassignment events.
 * ALL WITHOUT DIACRITICS — GSM 7-bit = 160 chars/segment.
 * Supports SK and CZ languages.
 */
export function techSmsTemplates(lang: 'sk' | 'cz' = 'sk') {
  const t = lang === 'cz' ? {
    techProtocolRequired: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} byla prerazena. Prosim odeslete zaverecny protokol za odpracovanou dobu.`,
    techEmergencyReassign: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} byla urgentne prerazena. Prosim odeslite protokol co nejdrive.`,
    techReassignedNotice: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} byla prerazena na jineho technika.`,
  } : {
    techProtocolRequired: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} bola preradena. Prosim odoslite zaverecny protokol za odpracovanu dobu.`,
    techEmergencyReassign: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} bola urgentne preradena. Prosim odoslite protokol co najskor.`,
    techReassignedNotice: (refNumber: string) =>
      `Zlati Remeslnici: Zakazka ${refNumber} bola preradena na ineho technika.`,
  }
  return t
}

/**
 * Send intro SMS to client when a new job is created.
 * Includes partner name, reference number, and diagnostic form link.
 *
 * Fire-and-forget — caller should not await or catch.
 */
export async function sendClientJobCreatedSms(data: {
  customerPhone: string
  customerCountry: string
  partnerId: number | null
  referenceNumber: string
  portalToken: string
}): Promise<void> {
  const { customerPhone, customerCountry, partnerId, referenceNumber, portalToken } = data
  if (!customerPhone) return

  try {
    const portalUrl = `${getAppBaseUrl()}/client/${portalToken}`
    const lang = (customerCountry || 'SK').toUpperCase() === 'CZ' ? 'cz' : 'sk'

    let partnerName = 'vasej poistovne'
    if (partnerId) {
      const { getPartnerById } = await import('./db')
      const partner = await getPartnerById(partnerId)
      if (partner) partnerName = partner.name
    }

    // Try DB-backed template first, fall back to legacy inline
    let message = await resolveSmsTemplate('job_created', lang, {
      partnerName,
      refNumber: referenceNumber,
      portalUrl,
    })
    if (message === null) {
      // Template disabled in DB — skip SMS
      return
    }
    if (!message) {
      // resolveSmsTemplate returned empty string — use legacy fallback
      const templates = clientSmsTemplates(portalUrl, lang)
      message = templates.jobCreated(partnerName, referenceNumber)
    }
    await notifyClientSms(customerPhone, message)
  } catch (err) {
    log.error(`ClientSMS jobCreated failed for ${maskPhone(data.customerPhone)}`, undefined, err)
  }
}

/**
 * Notify technician by ID with push → WA → SMS cascade.
 * Reads technician's notification_channel preference from DB.
 * Pass options.pushOnly = true to skip WA/SMS fallback.
 */
export async function notifyTechnicianById(
  technicianId: number,
  payload: PushPayload,
  options: NotifyOptions = {}
): Promise<NotifyResult> {
  const { getTechnicianById } = await import('./db')
  const technician = await getTechnicianById(technicianId)
  if (!technician) {
    return { success: false, method: 'none', error: 'technician_not_found' }
  }

  // Pass technician's channel preference unless caller explicitly set one
  if (!options.notificationChannel) {
    const channel = (technician as unknown as Record<string, unknown>).notification_channel as NotificationChannel | undefined
    if (channel && channel !== 'sms') {
      options = { ...options, notificationChannel: channel }
    }
  }

  return notifyTechnician(technician.phone, payload, options)
}

// ═══════════════════════════════════════════════════════════════
// RESCHEDULE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

export async function notifyRescheduleToClient(
  phone: string,
  data: {
    originalDate: string;
    originalTime: string | null;
    proposedDate: string;
    proposedTime: string | null;
    address: string;
    portalLink: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const origDt = formatSmsDt(data.originalDate, data.originalTime);
  const propDt = formatSmsDt(data.proposedDate, data.proposedTime);
  const lang = phone.startsWith('+420') ? 'cz' : 'sk';
  let message = await resolveSmsTemplate('reschedule_request', lang, {
    originalDate: origDt,
    proposedDate: propDt,
    address: data.address,
    portalUrl: data.portalLink,
  });
  if (message === null) return { success: true }; // disabled
  if (!message) {
    message = `Technik poziadal o zmenu terminu vasej opravy planovanej na ${origDt}, ${data.address}. Novy navrhovany termin: ${propDt}. Potvrdte alebo navrhnite iny: ${data.portalLink}`;
  }
  return notifyClientSms(phone, message);
}

export async function notifyRescheduleAcceptedToTech(
  phone: string,
  data: {
    customerName: string;
    resolvedDate: string;
    resolvedTime: string | null;
    address: string;
    referenceNumber?: string;
  },
  jobId?: number,
  lang?: TechLang
): Promise<NotifyResult> {
  const dateStr = formatSmsDt(data.resolvedDate, null);
  const timeStr = data.resolvedTime || '';
  const resolvedLang: TechLang = lang ?? (phone.startsWith('+420') ? 'cz' : 'sk');
  const refNum = data.referenceNumber || '';
  const { title, body } = tn(resolvedLang, 'rescheduleAccepted', refNum, data.customerName, dateStr, timeStr);
  const payload = {
    title,
    body,
    data: { type: 'reschedule_accepted' },
    url: jobId ? '/dispatch/job/' + jobId : '/dispatch',
  };
  return notifyTechnician(phone, payload, { smartSms: true });
}

export async function notifyCounterProposedToTech(
  phone: string,
  data: {
    customerName: string;
    originalDate: string;
    originalTime: string | null;
    address: string;
    referenceNumber?: string;
  },
  jobId?: number,
  lang?: TechLang
): Promise<NotifyResult> {
  const origDt = formatSmsDt(data.originalDate, data.originalTime);
  const resolvedLang: TechLang = lang ?? (phone.startsWith('+420') ? 'cz' : 'sk');
  const refNum = data.referenceNumber || '';
  const proposedDatesStr = `${origDt}, ${data.address}`;
  const { title, body } = tn(resolvedLang, 'rescheduleCounterProposed', refNum, data.customerName, proposedDatesStr);
  const payload = {
    title,
    body,
    data: { type: 'reschedule_counter' },
    url: jobId ? '/dispatch/job/' + jobId : '/dispatch',
  };
  return notifyTechnician(phone, payload, { smartSms: true });
}

export async function notifyRescheduleConfirmedToClient(
  phone: string,
  data: {
    resolvedDate: string;
    resolvedTime: string | null;
    originalDate: string;
    address: string;
    portalUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const resDt = formatSmsDt(data.resolvedDate, data.resolvedTime);
  const lang = phone.startsWith('+420') ? 'cz' : 'sk';
  let message = await resolveSmsTemplate('reschedule_confirmed', lang, {
    resolvedDate: resDt,
    originalDate: formatSmsDt(data.originalDate, null),
    address: data.address,
    portalUrl: data.portalUrl || '',
  });
  if (message === null) return { success: true }; // disabled
  if (!message) {
    const portalSuffix = data.portalUrl ? ` Sledujte postup: ${data.portalUrl}` : '';
    message = `Termin vasej opravy na adrese ${data.address} potvrdeny na ${resDt}. Povodny termin ${formatSmsDt(data.originalDate, null)} bol zmeneny. Dakujeme.${portalSuffix}`;
  }
  return notifyClientSms(phone, message);
}

export async function notifyScheduleChangedByOperator(
  techPhone: string | null,
  clientPhone: string | null,
  data: {
    customerName: string;
    originalDate: string;
    originalTime: string | null;
    newDate: string;
    newTime: string | null;
    address: string;
    notifyTech: boolean;
    notifyClient: boolean;
    portalUrl?: string;
  },
  jobId?: number
): Promise<void> {
  const origDt = formatSmsDt(data.originalDate, data.originalTime);
  const newDt = formatSmsDt(data.newDate, data.newTime);

  if (data.notifyTech && techPhone) {
    const techLangResolved: TechLang = techPhone.startsWith('+420') ? 'cz' : 'sk';
    const refNum = '';
    const { title, body } = tn(techLangResolved, 'scheduleChangedByOperator', refNum, data.customerName, data.address, origDt, newDt);
    const payload = {
      title,
      body,
      data: { type: 'schedule_changed' },
      url: jobId ? '/dispatch/job/' + jobId : '/dispatch',
    };
    await notifyTechnician(techPhone, payload, { smartSms: true });
  }

  if (data.notifyClient && clientPhone) {
    const lang = clientPhone.startsWith('+420') ? 'cz' : 'sk';
    let clientMessage = await resolveSmsTemplate('schedule_changed', lang, {
      originalDate: origDt,
      newDate: newDt,
      address: data.address,
      portalUrl: data.portalUrl || '',
    });
    if (clientMessage === null) {
      // Template disabled — skip client SMS
    } else {
      if (!clientMessage) {
        const portalSuffix = data.portalUrl ? ` Sledujte postup: ${data.portalUrl}` : '';
        clientMessage = `Termin vasej opravy planovanej na ${origDt}, ${data.address} zmeneny na ${newDt}.${portalSuffix}`;
      }
      await notifyClientSms(clientPhone, clientMessage);
    }
  }
}

export async function notifyRescheduleRejectedToTech(
  phone: string,
  data: {
    customerName: string;
    originalDate: string;
    originalTime: string | null;
    address: string;
    referenceNumber?: string;
  },
  jobId?: number,
  lang?: TechLang
): Promise<NotifyResult> {
  const resolvedLang: TechLang = lang ?? (phone.startsWith('+420') ? 'cz' : 'sk');
  const refNum = data.referenceNumber || '';
  const { title, body } = tn(resolvedLang, 'rescheduleRejected', refNum, data.customerName);
  const payload = {
    title,
    body,
    data: { type: 'reschedule_rejected' },
    url: jobId ? '/dispatch/job/' + jobId : '/dispatch',
  };
  return notifyTechnician(phone, payload, { smartSms: true });
}

/**
 * Find active technicians within radiusKm of a job and send push notification.
 * Uses last known GPS from technicians table.
 * Filters by: specialization match + GPS freshness (30 min) + distance.
 * Does NOT exclude busy technicians — they may finish current job and take this one.
 */
export async function notifyNearbyTechnicians(
  jobId: number,
  jobLat: number,
  jobLng: number,
  jobCategory: string,
  radiusKm: number = 20
): Promise<{ notified: number }> {
  const { query, getJobById } = await import('./db')
  const { haversineKm } = await import('./gpsTrackUtils')

  // Get job for notification payload
  const job = await getJobById(jobId)
  if (!job) return { notified: 0 }

  // Get active technicians with recent GPS (last 30 minutes)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000)
  const result = await query(
    `SELECT id, gps_lat, gps_lng, specializations, phone, country
     FROM technicians
     WHERE is_active = true
       AND gps_lat IS NOT NULL
       AND gps_lng IS NOT NULL
       AND gps_updated_at > $1`,
    [cutoff]
  )

  // Filter: specialization match + within radius
  // Match by leading code number (e.g. "01." matches "01. Plumber" and "01. Elektro")
  // Then fallback to stripped name comparison
  const extractCode = (s: string) => {
    const m = s.match(/^(\d+)\./)
    return m ? m[1].padStart(2, '0') : null
  }
  const stripName = (s: string) => s.replace(/^\d+\.\s*/, '').toLowerCase().trim()
  const jobCode = extractCode(jobCategory)
  const jobName = stripName(jobCategory)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nearby = result.rows.filter((t: any) => {
    // Check specialization — match by code prefix first, then by name
    const specs: string[] = t.specializations || []
    const hasSpec = specs.some((s: string) => {
      // Code match (e.g. "01" === "01") — most reliable
      if (jobCode) {
        const specCode = extractCode(s)
        if (specCode === jobCode) return true
      }
      // Name fallback
      return stripName(s) === jobName
    })
    if (!hasSpec) return false

    // Check distance
    const dist = haversineKm(Number(t.gps_lat), Number(t.gps_lng), jobLat, jobLng)
    return dist <= radiusKm
  })

  if (nearby.length === 0) return { notified: 0 }

  // Get partner name for SMS
  const { getPartnerById } = await import('./db')
  const partner = job.partner_id ? await getPartnerById(job.partner_id) : null

  // Send push notifications
  let notified = 0
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const isUrgent = job.urgency === 'urgent' || cf.urgent === true

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tech of nearby as any[]) {
    try {
      const lang: 'sk' | 'cz' = tech.country === 'CZ' ? 'cz' : 'sk'
      const payload = NotificationTemplates.newJob({
        referenceNumber: job.reference_number,
        city: job.customer_city || '',
        address: job.customer_address || undefined,
        category: job.category || '',
        description: job.description || undefined,
        distance: radiusKm,
        urgent: isUrgent,
        lang,
        partnerName: partner?.name || undefined,
      })
      await notifyTechnicianById(tech.id, payload)
      // Record notification so auto-notify waves don't re-notify this tech
      try {
        await query(
          `INSERT INTO job_technician_matches (job_id, technician_id, match_type, notified_at, notification_channel)
           VALUES ($1, $2, 'auto', NOW(), 'full')
           ON CONFLICT (job_id, technician_id) DO UPDATE SET notified_at = NOW(), notification_channel = 'full'`,
          [jobId, tech.id]
        )
      } catch (matchErr) { log.error(`Failed to record proximity match for tech ${tech.id}`, jobId, matchErr) }
      notified++
    } catch (err) {
      log.error(`Failed to notify nearby tech ${tech.id}`, jobId, err)
    }
  }

  log.info(`Proximity: ${notified}/${nearby.length} nearby techs notified`, jobId)
  return { notified }
}

// SMS-safe date formatting (no diacritics for GSM 7-bit)
function formatSmsDt(date: string, time: string | null): string {
  if (!date) return 'neurceny';
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const str = `${day}.${month}.`;
  return time ? `${str} o ${time}` : str;
}
