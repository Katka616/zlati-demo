/**
 * Tech Notification Translation Catalog
 *
 * Centralized, fully-typed push notification messages for technicians.
 * Supports SK (Slovak) and CZ (Czech) — standalone, no i18n/getTranslation dependency.
 *
 * Usage:
 *   const lang = await techLang(techId)
 *   const { title, body } = tn(lang, 'jobAssigned', refNum)
 */

import { getTechnicianById } from '@/lib/technician'

// ── Language type ─────────────────────────────────────────────────────────────

export type TechLang = 'sk' | 'cz'

/**
 * Derive technician language from their stored country code.
 * CZ country → Czech notifications. Everything else → Slovak.
 */
export function techLangFromCountry(country: string | null | undefined): TechLang {
  return country === 'CZ' ? 'cz' : 'sk'
}

/**
 * Load technician from DB and return their notification language.
 * Falls back to 'sk' if technician not found or DB unavailable.
 */
export async function techLang(techId: number): Promise<TechLang> {
  try {
    const tech = await getTechnicianById(techId)
    return techLangFromCountry(tech?.country)
  } catch (err) {
    console.error(`[techNotifications] Could not resolve language for tech ${techId}:`, err)
    return 'sk'
  }
}

// ── Catalog type definitions ──────────────────────────────────────────────────

interface TN { title: string; body: string }
type T = (lang: TechLang) => TN

// ── Catalog ───────────────────────────────────────────────────────────────────

const catalog = {

  // ── Job lifecycle ───────────────────────────────────────────────────────────

  jobCancelled: (lang: TechLang, refNum: string, reason: string): TN => ({
    title: lang === 'cz' ? 'Zakázka zrušena' : 'Zákazka zrušená',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} byla zrušena. Důvod: ${reason}`
      : `Zákazka ${refNum} bola zrušená. Dôvod: ${reason}`,
  }),

  jobAssigned: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Nová zakázka přidělena' : 'Nová zákazka pridelená',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} vám byla přidělena.`
      : `Zákazka ${refNum} vám bola pridelená.`,
  }),

  jobAssignedTakeover: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Zakázka přidělena (převzetí)' : 'Zákazka pridelená (prevzatie)',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} vám byla přidělena.`
      : `Zákazka ${refNum} vám bola pridelená.`,
  }),

  protocolRequired: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Odešlete závěrečný protokol' : 'Odošlite záverečný protokol',
    body:  lang === 'cz'
      ? `Zakázka ${refNum}: prosím odešlete protokol za odpracovanou dobu.`
      : `Zákazka ${refNum}: prosím odošlite protokol za odpracovanú dobu.`,
  }),

  jobReassigned: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Zakázka přeřazena' : 'Zákazka preradená',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} byla přeřazena na jiného technika.`
      : `Zákazka ${refNum} bola preradená na iného technika.`,
  }),

  jobEmergencyReassign: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Urgentní přeřazení zakázky' : 'Urgentné preradenie zákazky',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} byla urgentně přeřazena na jiného technika.`
      : `Zákazka ${refNum} bola urgentne preradená na iného technika.`,
  }),

  // ── Estimate / Pricing ──────────────────────────────────────────────────────

  estimateAutoApproved: (lang: TechLang, refNum: string, diagnosticOnly?: boolean): TN => ({
    title: lang === 'cz' ? 'Odhad automaticky schválen' : 'Odhad automaticky schválený',
    body:  diagnosticOnly
      ? (lang === 'cz'
        ? `${refNum} — Cena schválena. Vystavte prosím fakturu.`
        : `${refNum} — Cena schválená. Vystavte prosím faktúru.`)
      : (lang === 'cz'
        ? `${refNum} — Cena schválena, můžete pokračovat s opravou.`
        : `${refNum} — Cena schválená, môžete pokračovať s opravou.`),
  }),

  estimateAutoApprovedNextVisit: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Cena schválena — dokončete protokol' : 'Cena schválená — dokončite protokol',
    body:  lang === 'cz'
      ? `${refNum} — Cena schválena. Dokončete návštěvu a vyplňte protokol.`
      : `${refNum} — Cena schválená. Dokončite návštevu a vyplňte protokol.`,
  }),

  estimateSentToClient: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Odhad odeslán klientovi' : 'Odhad odoslaný klientovi',
    body:  lang === 'cz'
      ? `${refNum} — Čeká se na schválení doplatku klientem.`
      : `${refNum} — Čaká sa na schválenie doplatku klientom.`,
  }),

  estimateRejected: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Odhad odmítnut' : 'Odhad odmietnutý',
    body:  lang === 'cz'
      ? `${refNum} — Operátor odmítl váš cenový odhad. Zkontrolujte a opravte.`
      : `${refNum} — Operátor odmietol váš cenový odhad. Skontrolujte a opravte.`,
  }),

  priceRejected: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Cena odmítnuta' : 'Cena odmietnutá',
    body:  lang === 'cz'
      ? `${refNum} — Operátor odmítl finální cenu. Zkontrolujte vyúčtování.`
      : `${refNum} — Operátor odmietol finálnu cenu. Skontrolujte vyúčtovanie.`,
  }),

  // ── Settlement ──────────────────────────────────────────────────────────────

  settlementAutoApproved: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Cena automaticky schválena' : 'Cena automaticky schválená',
    body:  lang === 'cz'
      ? `${refNum} — Vyúčtování schváleno, vyplňte finální protokol.`
      : `${refNum} — Vyúčtovanie schválené, vyplňte finálny protokol.`,
  }),

  settlementAutoApproved48h: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Vyúčtování automaticky schváleno' : 'Vyúčtovanie automaticky schválené',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — vyúčtování bylo automaticky schváleno (48h bez akce).`
      : `Zákazka ${refNum} — vyúčtovanie bolo automaticky schválené (48h bez akcie).`,
  }),

  settlementReminder24h: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Zkontrolujte vyúčtování' : 'Skontrolujte vyúčtovanie',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} čeká na schválení vyúčtování`
      : `Zákazka ${refNum} čaká na schválenie vyúčtovania`,
  }),

  // ── Surcharge ───────────────────────────────────────────────────────────────

  surchargeToClient: (lang: TechLang, refNum: string, amount: string, currency: string): TN => ({
    title: lang === 'cz' ? 'Doplatek odeslán klientovi' : 'Doplatok odoslaný klientovi',
    body:  lang === 'cz'
      ? `${refNum} — Čeká se na schválení doplatku ${amount} ${currency} klientem.`
      : `${refNum} — Čaká sa na schválenie doplatku ${amount} ${currency} klientom.`,
  }),

  settlementCorrectionNeeded: (lang: TechLang, refNum: string, reason?: string): TN => ({
    title: lang === 'cz' ? 'Opravte vyúčtování' : 'Opravte vyúčtovanie',
    body: reason
      ? (lang === 'cz'
        ? `${refNum} — Dispečer vrátil vyúčtování k opravě: ${reason}`
        : `${refNum} — Dispečer vrátil vyúčtovanie na opravu: ${reason}`)
      : (lang === 'cz'
        ? `${refNum} — Dispečer vrátil vyúčtování k opravě.`
        : `${refNum} — Dispečer vrátil vyúčtovanie na opravu.`),
  }),

  settlementSurchargeChanged: (lang: TechLang, refNum: string, amount: string, currency: string): TN => ({
    title: lang === 'cz' ? 'Výše doplatku změněna' : 'Výška doplatku zmenená',
    body: lang === 'cz'
      ? `${refNum} — Nová výše doplatku: ${amount} ${currency}. Čeká se na schválení klientem.`
      : `${refNum} — Nová výška doplatku: ${amount} ${currency}. Čaká sa na schválenie klientom.`,
  }),

  // ── CRM status changes (admin) ──────────────────────────────────────────────

  statusWaitingSurcharge: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Změna stavu zakázky' : 'Zmena stavu zákazky',
    body:  lang === 'cz'
      ? `${refNum} — Zakázka čeká na schválení doplatku klientem.`
      : `${refNum} — Zákazka čaká na schválenie doplatku klientom.`,
  }),

  statusPriceApproved: (lang: TechLang, refNum: string, diagnosticOnly?: boolean): TN => ({
    title: lang === 'cz' ? 'Změna stavu zakázky' : 'Zmena stavu zákazky',
    body:  diagnosticOnly
      ? (lang === 'cz'
        ? `${refNum} — Cena schválena. Vystavte prosím fakturu.`
        : `${refNum} — Cena schválená. Vystavte prosím faktúru.`)
      : (lang === 'cz'
        ? `${refNum} — Cena schválena, pokračujte s opravou.`
        : `${refNum} — Cena schválená, pokračujte s opravou.`),
  }),

  statusSettlementReady: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Změna stavu zakázky' : 'Zmena stavu zákazky',
    body:  lang === 'cz'
      ? `${refNum} — Zakázka dokončena, připravte vyúčtování.`
      : `${refNum} — Zákazka dokončená, pripravte zúčtovanie.`,
  }),

  // ── Portal / Client actions ─────────────────────────────────────────────────

  scheduleApproved: (lang: TechLang, refNum: string, dateStr: string, timeStr: string): TN => ({
    title: lang === 'cz' ? '✅ Klient schválil termín' : '✅ Klient schválil termín',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — termín ${dateStr} ${timeStr} schválen.`
      : `Zákazka ${refNum} — termín ${dateStr} ${timeStr} schválený.`,
  }),

  scheduleDeclined: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '❌ Klient odmítl termín' : '❌ Klient odmietol termín',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — klient navrhuje jiný čas.`
      : `Zákazka ${refNum} — klient navrhuje iný čas.`,
  }),

  nextVisitProposed: (lang: TechLang, refNum: string, proposedDate: string, timeStr: string): TN => ({
    title: lang === 'cz' ? '📅 Klient navrhl termín' : '📅 Klient navrhol termín',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — klient navrhuje ${proposedDate}${timeStr}`
      : `Zákazka ${refNum} — klient navrhuje ${proposedDate}${timeStr}`,
  }),

  clientSurchargeApproved: (lang: TechLang, refNum: string, amt: string, currency: string, diagnosticOnly?: boolean): TN => ({
    title: lang === 'cz' ? 'Klient schválil doplatek' : 'Klient schválil doplatok',
    body:  diagnosticOnly
      ? (lang === 'cz'
        ? `${refNum} — Doplatek ${amt} ${currency} schválen. Vystavte prosím fakturu.`
        : `${refNum} — Doplatok ${amt} ${currency} schválený. Vystavte prosím faktúru.`)
      : (lang === 'cz'
        ? `${refNum} — Doplatek ${amt} ${currency} schválen. Pokračujte s opravou.`
        : `${refNum} — Doplatok ${amt} ${currency} schválený. Pokračujte s opravou.`),
  }),

  clientSurchargeApprovedNextVisit: (lang: TechLang, refNum: string, amt: string, currency: string): TN => ({
    title: lang === 'cz' ? 'Doplatek schválen — vyplňte protokol' : 'Doplatok schválený — vyplňte protokol',
    body:  lang === 'cz'
      ? `${refNum} — Doplatek ${amt} ${currency} schválen. Dokončete návštěvu a vyplňte protokol.`
      : `${refNum} — Doplatok ${amt} ${currency} schválený. Dokončite návštevu a vyplňte protokol.`,
  }),

  clientSurchargeDeclined: (lang: TechLang, refNum: string, amt: string, currency: string): TN => ({
    title: lang === 'cz' ? 'Klient odmítl doplatek' : 'Klient odmietol doplatok',
    body:  lang === 'cz'
      ? `${refNum} — Doplatek ${amt} ${currency} odmítnut. Kontaktujte dispečera.`
      : `${refNum} — Doplatok ${amt} ${currency} odmietnutý. Kontaktujte dispečera.`,
  }),

  protocolSigned: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '📝 Klient podepsal protokol' : '📝 Klient podpísal protokol',
    body:  lang === 'cz'
      ? `${refNum} — Protokol podepsán na místě.`
      : `${refNum} — Protokol podpísaný na mieste.`,
  }),

  protocolSignedMultiVisit: (lang: TechLang, refNum: string, visitNum: number): TN => ({
    title: lang === 'cz' ? '📝 Dílčí protokol podepsán' : '📝 Čiastkový protokol podpísaný',
    body:  lang === 'cz'
      ? `${refNum} — Protokol návštěvy č. ${visitNum} podepsán.`
      : `${refNum} — Protokol návštevy č. ${visitNum} podpísaný.`,
  }),

  finalProtocolSigned: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '📝 Klient podepsal finální protokol' : '📝 Klient podpísal finálny protokol',
    body:  lang === 'cz'
      ? `${refNum} — Finální protokol podepsán. Pokračujte k vyúčtování.`
      : `${refNum} — Finálny protokol podpísaný. Pokračujte k vyúčtovaniu.`,
  }),

  settlementSurchargeApproved: (lang: TechLang, refNum: string, surchargeText: string): TN => ({
    title: lang === 'cz' ? '✅ Klient schválil finální doplatek' : '✅ Klient schválil finálny doplatok',
    body:  lang === 'cz'
      ? `${refNum} — ${surchargeText}`
      : `${refNum} — ${surchargeText}`,
  }),

  jobCancelledByClient: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '🚫 Klient zrušil zakázku' : '🚫 Klient zrušil zákazku',
    body:  lang === 'cz'
      ? `${refNum} — Klient oznámil vyřešení problému.`
      : `${refNum} — Klient oznámil vyriešenie problému.`,
  }),

  // ── Multi-visit ─────────────────────────────────────────────────────────────

  multiVisitCompleted: (lang: TechLang, refNum: string, visitNum: number, nextDate: string): TN => ({
    title: lang === 'cz' ? `Návštěva č. ${visitNum} dokončena` : `Návšteva č. ${visitNum} dokončená`,
    body:  lang === 'cz'
      ? `${refNum} — Naplánujte výjezd č. ${visitNum + 1} na ${nextDate}.`
      : `${refNum} — Naplánujte výjazd č. ${visitNum + 1} na ${nextDate}.`,
  }),

  multiVisitFollowUp: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '📅 Doplňte termín další návštěvy' : '📅 Doplňte termín ďalšej návštevy',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — prosím doplňte datum další návštěvy.`
      : `Zákazka ${refNum} — prosím doplňte dátum ďalšej návštevy.`,
  }),

  // ── Invoice ─────────────────────────────────────────────────────────────────

  invoiceDraftReady: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Nový návrh faktury' : 'Nový návrh faktúry',
    body:  lang === 'cz'
      ? `${refNum} — Zkontrolujte a nahrajte fakturu.`
      : `${refNum} — Skontrolujte a nahrajte faktúru.`,
  }),

  invoiceDraftReminder: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Faktura čeká na potvrzení' : 'Faktúra čaká na potvrdenie',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — Zkontrolujte a potvrďte návrh faktury`
      : `Zákazka ${refNum} — Skontrolujte a potvrďte návrh faktúry`,
  }),

  invoiceAutoConfirmed: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Faktura automaticky potvrzena' : 'Faktúra automaticky potvrdená',
    body:  lang === 'cz'
      ? `Faktura pro zakázku ${refNum} byla automaticky potvrzena (72h bez akce)`
      : `Faktúra pre zákazku ${refNum} bola automaticky potvrdená (72h bez akcie)`,
  }),

  // ── Parts delivery ──────────────────────────────────────────────────────────

  deliveryDateMissing: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Zadejte termín dodání' : 'Zadajte termín dodania',
    body:  lang === 'cz'
      ? `Zakázka ${refNum}: zadejte očekávané datum dodání materiálu.`
      : `Zákazka ${refNum}: zadajte očakávaný dátum dodania materiálu.`,
  }),

  deliveryApproaching: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? 'Dodání materiálu zítra' : 'Dodanie materiálu zajtra',
    body:  lang === 'cz'
      ? `Zakázka ${refNum}: materiál by měl být dodán zítra.`
      : `Zákazka ${refNum}: materiál by mal byť dodaný zajtra.`,
  }),

  deliveryApproachingWithVisit: (lang: TechLang, refNum: string, nextVisitDate: string): TN => ({
    title: lang === 'cz' ? 'Dodání materiálu zítra' : 'Dodanie materiálu zajtra',
    body:  lang === 'cz'
      ? `Zakázka ${refNum}: materiál by měl být dodán zítra. Další návštěva naplánována na ${nextVisitDate}.`
      : `Zákazka ${refNum}: materiál by mal byť dodaný zajtra. Ďalšia návšteva naplánovaná na ${nextVisitDate}.`,
  }),

  deliveryOverdue: (lang: TechLang, refNum: string, deliveryDate: string): TN => ({
    title: lang === 'cz' ? 'Termín dodání materiálu uplynul' : 'Termín dodania materiálu uplynul',
    body:  lang === 'cz'
      ? `Zakázka ${refNum}: termín dodání materiálu (${deliveryDate}) uplynul. Aktualizujte stav.`
      : `Zákazka ${refNum}: termín dodania materiálu (${deliveryDate}) uplynul. Aktualizujte stav.`,
  }),

  // ── Reschedule ──────────────────────────────────────────────────────────────

  rescheduleAccepted: (lang: TechLang, refNum: string, customerName: string, dateStr: string, timeStr: string): TN => ({
    title: lang === 'cz' ? 'Termín potvrzen' : 'Termín potvrdený',
    body:  lang === 'cz'
      ? `Klient ${customerName} souhlasil se změnou termínu na ${dateStr} ${timeStr}.`
      : `Klient ${customerName} súhlasil so zmenou termínu na ${dateStr} ${timeStr}.`,
  }),

  rescheduleCounterProposed: (lang: TechLang, refNum: string, customerName: string, proposedDates: string): TN => ({
    title: lang === 'cz' ? 'Klient navrhl jiné termíny' : 'Klient navrhol iné termíny',
    body:  lang === 'cz'
      ? `Klient ${customerName} navrhl jiné termíny pro zakázku ${refNum}: ${proposedDates}`
      : `Klient ${customerName} navrhol iné termíny pre zákazku ${refNum}: ${proposedDates}`,
  }),

  scheduleChangedByOperator: (
    lang: TechLang,
    refNum: string,
    customerName: string,
    address: string,
    origDt: string,
    newDt: string,
  ): TN => ({
    title: lang === 'cz' ? 'Termín změněn' : 'Termín zmenený',
    body:  lang === 'cz'
      ? `Termín opravy u ${customerName}, ${address} změněn z ${origDt} na ${newDt}.`
      : `Termín opravy u ${customerName}, ${address} zmenený z ${origDt} na ${newDt}.`,
  }),

  rescheduleRejected: (lang: TechLang, refNum: string, customerName: string): TN => ({
    title: lang === 'cz' ? 'Žádost zamítnuta' : 'Žiadosť zamietnutá',
    body:  lang === 'cz'
      ? `Vaše žádost o změnu termínu pro zakázku ${refNum} (${customerName}) byla zamítnuta.`
      : `Vaša žiadosť o zmenu termínu pre zákazku ${refNum} (${customerName}) bola zamietnutá.`,
  }),

  // ── Voicebot ────────────────────────────────────────────────────────────────

  voicebotSurchargeApproved: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '✅ Klient schválil doplatek' : '✅ Klient schválil doplatok',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — klient souhlasí s doplatkem (telefonicky).`
      : `Zákazka ${refNum} — klient súhlasí s doplatkom (telefonicky).`,
  }),

  voicebotSurchargeDeclined: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '❌ Klient odmítl doplatek' : '❌ Klient odmietol doplatok',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — klient nesouhlasí s doplatkem (telefonicky).`
      : `Zákazka ${refNum} — klient nesúhlasí s doplatkom (telefonicky).`,
  }),

  voicebotScheduleApproved: (lang: TechLang, refNum: string, dateStr: string, timeStr: string): TN => ({
    title: lang === 'cz' ? '✅ Klient schválil termín' : '✅ Klient schválil termín',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — termín ${dateStr} ${timeStr} schválen (voicebot).`
      : `Zákazka ${refNum} — termín ${dateStr} ${timeStr} schválený (voicebot).`,
  }),

  voicebotProtocolConfirmed: (lang: TechLang, refNum: string): TN => ({
    title: lang === 'cz' ? '📝 Klient potvrdil protokol' : '📝 Klient potvrdil protokol',
    body:  lang === 'cz'
      ? `Zakázka ${refNum} — protokol potvrzen telefonicky.`
      : `Zákazka ${refNum} — protokol potvrdený telefonicky.`,
  }),

  // ── Test ────────────────────────────────────────────────────────────────────

  testNotification: (lang: TechLang): TN => ({
    title: lang === 'cz' ? '🔔 Test notifikace' : '🔔 Test notifikácia',
    body:  lang === 'cz'
      ? 'Push notifikace fungují správně!'
      : 'Push notifikácie fungujú správne!',
  }),

  // ── Chat ────────────────────────────────────────────────────────────────────

  /**
   * Operator chat message — body is the raw message text, not translated.
   */
  newOperatorMessage: (_lang: TechLang, messageBody: string): TN => ({
    title: 'Nová správa od operátora',
    body:  messageBody,
  }),

} as const

// ── Typed `tn()` function ─────────────────────────────────────────────────────

/**
 * Lookup map: key → parameter types (excluding the leading `lang` parameter).
 * TypeScript infers this from the catalog object above.
 */
type CatalogArgs = {
  [K in keyof typeof catalog]: typeof catalog[K] extends (lang: TechLang, ...args: infer A) => TN ? A : never
}

/**
 * Translate a technician notification.
 *
 * @param lang    'sk' | 'cz'
 * @param key     Notification key (type-checked against catalog)
 * @param args    Arguments specific to that notification (type-checked per key)
 * @returns       { title, body } in the requested language
 *
 * @example
 *   tn('sk', 'jobCancelled', 'ZR-123', 'Storno poisťovňou')
 *   tn('cz', 'surchargeToClient', 'ZR-456', '1 200', 'Kč')
 */
export function tn<K extends keyof typeof catalog>(
  lang: TechLang,
  key: K,
  ...args: CatalogArgs[K]
): TN {
  // TypeScript cannot narrow the spread perfectly here, so we cast.
  // Safety is enforced by the CatalogArgs mapped type above.
  const fn = catalog[key] as (lang: TechLang, ...a: unknown[]) => TN
  return fn(lang, ...args)
}
