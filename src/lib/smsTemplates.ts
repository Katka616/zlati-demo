/**
 * SMS Template resolution engine.
 * Loads templates from DB (editable by operator), falls back to hardcoded defaults.
 * ALL templates are WITHOUT diacritics (GSM 7-bit = 160 chars/segment).
 */

import { getSmsTemplateByKey, upsertSmsTemplate, isDatabaseAvailable } from './db'

// ── Default templates (hardcoded fallback) ──────────────────────────────────

export const DEFAULT_SMS_TEMPLATES: Record<string, {
  template_sk: string
  template_cz: string
  description: string
  variables: string[]
}> = {
  job_created: {
    template_sk: 'Zlati Remeslnici ({partnerName}): Prijali sme vase hlasenie c. {refNumber}. Vyplnte formular pre rychlejsie vybavenie: {portalUrl}',
    template_cz: 'Zlati Remeslnici ({partnerName}): Prijali jsme vase hlaseni c. {refNumber}. Vyplnte formular pro rychlejsi vyrizeni: {portalUrl}',
    description: 'Odoslana pri vytvoreni novej zakazky. Obsahuje odkaz na klientsky portal.',
    variables: ['partnerName', 'refNumber', 'portalUrl'],
  },
  tech_assigned: {
    template_sk: 'Zlati Remeslnici: K vasej zakazke bol prideleny technik {techName}. Sledujte stav: {portalUrl}',
    template_cz: 'Zlati Remeslnici: K vasi zakazce byl prirazen technik {techName}. Sledujte stav: {portalUrl}',
    description: 'Odoslana ked je technik priradeny k zakazke.',
    variables: ['techName', 'portalUrl'],
  },
  tech_reassigned: {
    template_sk: 'Zlati Remeslnici: Doslo k zmene technika. Novy technik: {techName}. Sledujte stav: {portalUrl}',
    template_cz: 'Zlati Remeslnici: Doslo ke zmene technika. Novy technik: {techName}. Sledujte stav: {portalUrl}',
    description: 'Odoslana pri zmene technika na zakazke.',
    variables: ['techName', 'portalUrl'],
  },
  tech_en_route: {
    template_sk: 'Zlati Remeslnici: Technik {techName} je na ceste k vam. Sledujte stav: {portalUrl}',
    template_cz: 'Zlati Remeslnici: Technik {techName} je na ceste k vam. Sledujte stav: {portalUrl}',
    description: 'Odoslana ked technik vyrazil na cestu ku klientovi.',
    variables: ['techName', 'portalUrl'],
  },
  surcharge_needed: {
    template_sk: 'Zlati Remeslnici: K vasej zakazke je potrebny doplatok {amount}. Rozhodnite prosim tu: {portalUrl}',
    template_cz: 'Zlati Remeslnici: K vasi zakazce je potrebny doplatek {amount}. Rozhodnete prosim zde: {portalUrl}',
    description: 'Odoslana ked je potrebne schvalenie doplatku od klienta.',
    variables: ['amount', 'portalUrl'],
  },
  protocol_ready: {
    template_sk: 'Zlati Remeslnici: Protokol o oprave je pripraveny. Skontrolujte a podpiste tu: {portalUrl}',
    template_cz: 'Zlati Remeslnici: Protokol o oprave je pripraven. Zkontrolujte a podepiste zde: {portalUrl}',
    description: 'Odoslana po odoslani protokolu technikom. Klient ma skontrolovat a podpisat.',
    variables: ['portalUrl'],
  },
  reschedule_request: {
    template_sk: 'Zlati Remeslnici: Technik ziada o zmenu terminu vasej opravy ({address}) z {originalDate} na {proposedDate}. Potvrdte alebo navrhnite iny termin: {portalUrl}',
    template_cz: 'Zlati Remeslnici: Technik zada o zmenu terminu vasi opravy ({address}) z {originalDate} na {proposedDate}. Potvrdte nebo navrhnete jiny termin: {portalUrl}',
    description: 'Odoslana ked technik ziada o zmenu terminu.',
    variables: ['originalDate', 'proposedDate', 'address', 'portalUrl'],
  },
  reschedule_confirmed: {
    template_sk: 'Zlati Remeslnici: Termin vasej opravy ({address}) bol potvrdeny na {resolvedDate} (povodne {originalDate}). Dakujeme. {portalUrl}',
    template_cz: 'Zlati Remeslnici: Termin vasi opravy ({address}) byl potvrzen na {resolvedDate} (puvodni {originalDate}). Dekujeme. {portalUrl}',
    description: 'Odoslana ked je novy termin potvrdeny.',
    variables: ['resolvedDate', 'originalDate', 'address', 'portalUrl'],
  },
  schedule_changed: {
    template_sk: 'Zlati Remeslnici: Termin vasej opravy ({address}) bol zmeneny z {originalDate} na {newDate}. {portalUrl}',
    template_cz: 'Zlati Remeslnici: Termin vasi opravy ({address}) byl zmenen z {originalDate} na {newDate}. {portalUrl}',
    description: 'Odoslana ked operator zmeni termin zakazky.',
    variables: ['originalDate', 'newDate', 'address', 'portalUrl'],
  },
}

// ── Template resolution ─────────────────────────────────────────────────────

/**
 * Resolve an SMS template by key and language.
 * 1. Try DB (operator may have customized the text)
 * 2. Fall back to hardcoded default
 * 3. Replace {variables} with provided values
 */
export async function resolveSmsTemplate(
  key: string,
  lang: 'sk' | 'cz',
  vars: Record<string, string>
): Promise<string | null> {
  let template: string | null = null

  // Try DB first
  if (isDatabaseAvailable()) {
    try {
      const row = await getSmsTemplateByKey(key)
      if (row && row.is_active) {
        template = lang === 'cz' ? row.template_cz : row.template_sk
      } else if (row && !row.is_active) {
        // Template exists but is disabled — don't send SMS
        return null
      }
    } catch (err) {
      console.error(`[SmsTemplates] DB lookup failed for '${key}':`, err)
    }
  }

  // Fallback to hardcoded
  if (!template) {
    const def = DEFAULT_SMS_TEMPLATES[key]
    if (!def) {
      console.warn(`[SmsTemplates] Unknown template key: '${key}'`)
      return null
    }
    template = lang === 'cz' ? def.template_cz : def.template_sk
  }

  // Replace variables
  for (const [varName, value] of Object.entries(vars)) {
    template = template.replace(new RegExp(`\\{${varName}\\}`, 'g'), value)
  }

  return template
}

/**
 * Seed default templates into DB (if not already present).
 * Called on first API access. Does NOT overwrite existing customizations.
 */
export async function seedDefaultTemplates(): Promise<void> {
  if (!isDatabaseAvailable()) return

  for (const [key, def] of Object.entries(DEFAULT_SMS_TEMPLATES)) {
    try {
      const existing = await getSmsTemplateByKey(key)
      if (!existing) {
        await upsertSmsTemplate({
          key,
          template_sk: def.template_sk,
          template_cz: def.template_cz,
          description: def.description,
          variables: def.variables,
          is_active: true,
          is_custom: false,
        })
      }
    } catch (err) {
      console.error(`[SmsTemplates] Failed to seed '${key}':`, err)
    }
  }
}
