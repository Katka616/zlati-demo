/**
 * AI Command Center — Daily Briefing Agent
 *
 * Generates and sends a morning briefing to Katka.
 * Triggered by cron at 7:30 every morning.
 *
 * Contents:
 * - Yesterday's summary (jobs, cashflow, escalations)
 * - Today's plan (scheduled jobs, capacity)
 * - Pending decisions for Katka
 * - AI activity summary
 */

import { query } from '@/lib/db'
import { sendSms } from '@/lib/sms'
import { sendEmail } from '@/lib/gmail'
import { getPendingEscalations, recordAgentRun, trackAgentCost } from './db'
import { chatCompletion, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'

const KATKA_PHONE = process.env.KATKA_PHONE || ''
const KATKA_EMAIL = process.env.KATKA_EMAIL || ''
const AGENT_NAME = 'sysadmin' as const

interface BriefingData {
  yesterday: {
    total_jobs: number
    completed: number
    cancelled: number
    new_jobs: number
    complaints: number
  }
  today: {
    scheduled: number
    unassigned: number
    in_progress: number
  }
  cashflow: {
    invoiced_yesterday_czk: number
    paid_yesterday_czk: number
    pending_invoices: number
  }
  ai: {
    decisions_yesterday: number
    auto_approved: number
    escalated: number
  }
  pending_for_katka: number
}

async function gatherBriefingData(): Promise<BriefingData> {
  const [yesterday, today, cashflow, aiStats, pending] = await Promise.all([
    // Yesterday's job stats
    query(`
      SELECT
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'dokoncene' OR crm_step >= 8) AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE) AS new_jobs,
        0 AS complaints
      FROM jobs
      WHERE updated_at >= CURRENT_DATE - 1 AND updated_at < CURRENT_DATE
    `),
    // Today's plan
    query(`
      SELECT
        COUNT(*) FILTER (WHERE scheduled_date = CURRENT_DATE) AS scheduled,
        COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('cancelled', 'on_hold', 'archived', 'uzavrete')) AS unassigned,
        COUNT(*) FILTER (WHERE crm_step BETWEEN 2 AND 7) AS in_progress
      FROM jobs
      WHERE status NOT IN ('cancelled', 'archived', 'uzavrete')
    `),
    // Cashflow
    query(`
      SELECT
        COALESCE(SUM(CASE WHEN ei.created_at >= CURRENT_DATE - 1 AND ei.created_at < CURRENT_DATE THEN ei.amount ELSE 0 END), 0) AS invoiced_yesterday,
        COALESCE(SUM(CASE WHEN ei.paid_at >= CURRENT_DATE - 1 AND ei.paid_at < CURRENT_DATE THEN ei.amount ELSE 0 END), 0) AS paid_yesterday,
        COUNT(*) FILTER (WHERE ei.status = 'sent' OR ei.status = 'generated') AS pending_invoices
      FROM ea_invoices ei
    `).catch(() => ({ rows: [{ invoiced_yesterday: 0, paid_yesterday: 0, pending_invoices: 0 }] })),
    // AI decisions yesterday
    query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'auto_approved') AS auto_approved,
        COUNT(*) FILTER (WHERE escalated_to IS NOT NULL) AS escalated
      FROM ai_decisions
      WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE
    `).catch(() => ({ rows: [{ total: 0, auto_approved: 0, escalated: 0 }] })),
    // Pending for Katka
    getPendingEscalations(),
  ])

  const y = yesterday.rows[0] || {}
  const t = today.rows[0] || {}
  const c = cashflow.rows[0] || {}
  const a = aiStats.rows[0] || {}

  return {
    yesterday: {
      total_jobs: parseInt(y.total_jobs || '0', 10),
      completed: parseInt(y.completed || '0', 10),
      cancelled: parseInt(y.cancelled || '0', 10),
      new_jobs: parseInt(y.new_jobs || '0', 10),
      complaints: 0,
    },
    today: {
      scheduled: parseInt(t.scheduled || '0', 10),
      unassigned: parseInt(t.unassigned || '0', 10),
      in_progress: parseInt(t.in_progress || '0', 10),
    },
    cashflow: {
      invoiced_yesterday_czk: parseFloat(c.invoiced_yesterday || '0'),
      paid_yesterday_czk: parseFloat(c.paid_yesterday || '0'),
      pending_invoices: parseInt(c.pending_invoices || '0', 10),
    },
    ai: {
      decisions_yesterday: parseInt(a.total || '0', 10),
      auto_approved: parseInt(a.auto_approved || '0', 10),
      escalated: parseInt(a.escalated || '0', 10),
    },
    pending_for_katka: pending.length,
  }
}

async function generateAiSummary(data: BriefingData): Promise<string | null> {
  try {
    const result = await chatCompletion({
      systemPrompt: `Si AI asistent CEO firmy Zlatí Řemeslníci (havarijný servis pre poisťovne CZ/SK).
Zhrň dáta do 3-5 viet. Použi slovenčinu. Buď konkrétny — čísla, mená, sumy.
Formát: 1) Zhrnutie včerajška 2) Top 3 priority na dnes 3) Riziká/varovania`,
      userMessage: JSON.stringify(data),
      model: TIER_A_MODEL,
      provider: TIER_A_PROVIDER,
      maxTokens: 400,
      temperature: 0.3,
    })
    return result
  } catch (err) {
    console.error('[AI Briefing] LLM summary failed, falling back to template:', err)
    return null
  }
}

function formatBriefingSms(data: BriefingData, aiSummary?: string | null): string {
  const lines: string[] = []

  lines.push('Dobré ráno! Tvoj denný prehľad:')
  if (aiSummary) {
    lines.push('')
    lines.push('--- AI Zhrnutie ---')
    lines.push(aiSummary)
    lines.push('---')
  }
  lines.push('')
  lines.push(`Včera: ${data.yesterday.new_jobs} nových, ${data.yesterday.completed} dokončených`)
  lines.push(`Dnes: ${data.today.scheduled} plánovaných, ${data.today.in_progress} v práci`)

  if (data.today.unassigned > 0) {
    lines.push(`⚠ ${data.today.unassigned} bez technika`)
  }

  if (data.cashflow.invoiced_yesterday_czk > 0) {
    lines.push(`Fakturované včera: ${Math.round(data.cashflow.invoiced_yesterday_czk).toLocaleString('cs')} Kč`)
  }

  if (data.pending_for_katka > 0) {
    lines.push('')
    lines.push(`Na tvoje rozhodnutie: ${data.pending_for_katka} →`)
    lines.push('Otvor AI Command Center')
  }

  if (data.ai.decisions_yesterday > 0) {
    lines.push(`AI: ${data.ai.decisions_yesterday} rozhodnutí (${data.ai.auto_approved} auto)`)
  }

  return lines.join('\n')
}

function formatBriefingEmail(data: BriefingData, aiSummary?: string | null): { subject: string; html: string } {
  const subject = `ZR Briefing: ${data.today.scheduled} plánovaných` +
    (data.pending_for_katka > 0 ? ` · ${data.pending_for_katka} čaká na teba` : '')

  const html = `
    <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 32px; border-radius: 12px;">
      <h1 style="font-family: Cinzel, serif; color: #D4A843; font-size: 24px; margin-bottom: 24px;">Dobré ráno</h1>

      ${aiSummary ? `
        <div style="background: rgba(212, 168, 67, 0.08); border-left: 3px solid #D4A843; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
          <strong style="color: #D4A843; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">AI Zhrnutie</strong>
          <p style="margin: 8px 0 0; color: #e5e5e5; line-height: 1.6; white-space: pre-line;">${aiSummary}</p>
        </div>
      ` : ''}

      ${data.pending_for_katka > 0 ? `
        <div style="background: rgba(212, 168, 67, 0.15); border: 1px solid rgba(212, 168, 67, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <strong style="color: #D4A843;">Čaká na teba: ${data.pending_for_katka} rozhodnutí</strong>
          <p style="margin: 8px 0 0; color: #ccc;">Otvor AI Command Center a schváľ/zamietni jedným klikom.</p>
        </div>
      ` : ''}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">Včera nových</span><br>
            <strong style="font-size: 20px;">${data.yesterday.new_jobs}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">Dokončených</span><br>
            <strong style="font-size: 20px;">${data.yesterday.completed}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">Dnes plánovaných</span><br>
            <strong style="font-size: 20px;">${data.today.scheduled}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">V práci</span><br>
            <strong style="font-size: 20px;">${data.today.in_progress}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">Bez technika</span><br>
            <strong style="font-size: 20px; ${data.today.unassigned > 0 ? 'color: #f59e0b;' : ''}">${data.today.unassigned}</strong>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #222;">
            <span style="color: #888;">Čaká na platbu</span><br>
            <strong style="font-size: 20px;">${data.cashflow.pending_invoices}</strong>
          </td>
        </tr>
      </table>

      ${data.ai.decisions_yesterday > 0 ? `
        <p style="color: #888; font-size: 13px;">
          AI zamestnanci včera: ${data.ai.decisions_yesterday} rozhodnutí
          (${data.ai.auto_approved} automatických, ${data.ai.escalated} eskalovaných)
        </p>
      ` : ''}

      <p style="color: #555; font-size: 11px; margin-top: 32px;">
        Zlatí Řemeslníci · AI Command Center
      </p>
    </div>
  `

  return { subject, html }
}

/**
 * Run the daily briefing agent.
 * Called from cron endpoint.
 */
export async function runDailyBriefing(): Promise<{ success: boolean; sms_sent: boolean; email_sent: boolean }> {
  let sms_sent = false
  let email_sent = false

  try {
    const data = await gatherBriefingData()

    // Generate AI summary (Tier A — DeepSeek). Falls back to null on failure.
    const aiSummary = await generateAiSummary(data)

    // Send SMS if phone configured
    if (KATKA_PHONE) {
      const smsText = formatBriefingSms(data, aiSummary)
      const smsResult = await sendSms(KATKA_PHONE, smsText)
      sms_sent = smsResult.success
      if (sms_sent) {
        await trackAgentCost(AGENT_NAME, { sms_count: 1, sms_cost_czk: 3, actions_count: 1 })
      }
    }

    // Send email if configured
    if (KATKA_EMAIL) {
      const { subject, html } = formatBriefingEmail(data, aiSummary)
      try {
        await sendEmail({
          to: KATKA_EMAIL,
          subject,
          body: html,
          textBody: formatBriefingSms(data, aiSummary),
        })
        email_sent = true
      } catch (err) {
        console.error('[AI Briefing] Email send failed:', err)
      }
    }

    await recordAgentRun(AGENT_NAME)
    console.log(`[AI Briefing] Daily briefing sent — SMS: ${sms_sent}, Email: ${email_sent}`)

    return { success: true, sms_sent, email_sent }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    await recordAgentRun(AGENT_NAME, errorMsg).catch(() => {})
    console.error('[AI Briefing] Failed:', err)
    return { success: false, sms_sent, email_sent }
  }
}
