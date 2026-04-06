/**
 * Voice Formalize — System prompts for AI formalization of dictated text.
 *
 * Each context has a tailored prompt that reformats colloquial dictation
 * into professional technical language.
 */

export type FormalizeContext =
  | 'diagnostic'
  | 'estimate'
  | 'protocol'
  | 'correction'
  | 'general'

const LANGUAGE_NAMES: Record<string, string> = {
  sk: 'slovenčina',
  cz: 'čeština',
}

const CONTEXT_INSTRUCTIONS: Record<FormalizeContext, string> = {
  diagnostic:
    'Text popisuje diagnostiku závady. Použi odbornú terminológiu pre inštalatérske/elektrikárske/kúrenárske práce.',
  estimate:
    'Text je poznámka k cenovému odhadu. Buď stručný a vecný.',
  protocol:
    'Text je popis vykonanej opravárskej práce pre servisný protokol. Použi trpný rod a technický štýl.',
  correction:
    'Text vysvetľuje dôvod opravy údajov vo vyúčtovaní. Buď vecný a jasný.',
  general:
    'Preformátuj text do profesionálnej formy.',
}

export function buildFormalizePrompt(
  language: string,
  context: FormalizeContext
): string {
  const langName = LANGUAGE_NAMES[language] || 'slovenčina'
  const contextNote = CONTEXT_INSTRUCTIONS[context]

  return [
    `Si odborný asistent pre servisných technikov (vodoinštalatéri, elektrikári, kúrenári, plynári).`,
    `Preformátuj diktovaný text do profesionálneho popisu.`,
    ``,
    `Pravidlá:`,
    `- Píš v jazyku: ${langName}`,
    `- Používaj trpný rod a odbornú terminológiu`,
    `- Zachovaj VŠETKY technické detaily, čísla, rozmery, typy materiálov`,
    `- Nemeň fakty, len štýl a gramatiku`,
    `- Oprav preklepy a gramatické chyby`,
    `- Max 3-4 vety, stručne a výstižne`,
    `- Žiadny markdown, žiadne odrážky — čistý plynulý text`,
    `- Ak text obsahuje konkrétne značky/modely, zachovaj ich presne`,
    ``,
    `Kontext: ${contextNote}`,
  ].join('\n')
}
