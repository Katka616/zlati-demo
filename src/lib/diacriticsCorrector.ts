/**
 * Automatic diacritics correction for material names.
 *
 * When a technician types "rura pvc" on a phone keyboard without diacritics,
 * this module corrects it to "Rúra PVC" using a word-level dictionary
 * of common SK/CZ construction/plumbing/electrical terms.
 *
 * Two-pass approach:
 *  1. Multi-word phrases first (e.g. "montazna pena" → "Montážna pena")
 *  2. Single words (e.g. "rura" → "rúra", "sifon" → "sifón")
 */

// ── Multi-word phrase corrections (checked first) ─────────────────────────────

const PHRASE_CORRECTIONS_SK: [string, string][] = [
  // Common compound material names
  ['flexi hadica', 'Flexi hadica'],
  ['rohovy ventil', 'Rohový ventil'],
  ['gulovy ventil', 'Guľový ventil'],
  ['spatny ventil', 'Spätný ventil'],
  ['redukcny ventil', 'Redukčný ventil'],
  ['poistny ventil', 'Poistný ventil'],
  ['tesniaca pasta', 'Tesniaca pasta'],
  ['teflonova paska', 'Teflónová páska'],
  ['gumove tesnenie', 'Gumové tesnenie'],
  ['montazna pena', 'Montážna pena'],
  ['izolacna paska', 'Izolačná páska'],
  ['lepiaca paska', 'Lepiaca páska'],
  ['ppr rurka', 'PPR rúrka'],
  ['ppr rura', 'PPR rúra'],
  ['pvc rura', 'PVC rúra'],
  ['cu rurka', 'Cu rúrka'],
  ['sdk doska', 'SDK doska'],
  ['osb doska', 'OSB doska'],
  ['wc sedatko', 'WC sedátko'],
  ['wc manzeta', 'WC manžeta'],
  ['wc misa', 'WC misa'],
  ['wc nadrzka', 'WC nádržka'],
  ['revizne dvierka', 'Revízne dvierka'],
  ['expanzna nadoba', 'Expanzná nádoba'],
  ['prudovy chranic', 'Prúdový chránič'],
  ['prepatova ochrana', 'Prepäťová ochrana'],
  ['stahovacia paska', 'Sťahovacia páska'],
  ['brusny papier', 'Brúsny papier'],
  ['maliarsky valec', 'Maliarsky valec'],
  ['zakryvacia folia', 'Zakrývacia fólia'],
  ['chemicka kotva', 'Chemická kotva'],
  ['diamantovy kotuc', 'Diamantový kotúč'],
  ['rezny kotuc', 'Rezný kotúč'],
  ['snehova zabrana', 'Snehová zábrana'],
  ['stresne okno', 'Strešné okno'],
  ['stresna folia', 'Strešná fólia'],
  ['hydroizolacna', 'Hydroizolačná'],
  ['nivelacna stierka', 'Nivelačná stierka'],
  ['skarovacia hmota', 'Škárovacia hmota'],
  ['obehove cerpadlo', 'Obehové čerpadlo'],
  ['ponorne cerpadlo', 'Ponorné čerpadlo'],
  ['kalove cerpadlo', 'Kalové čerpadlo'],
  ['domaca vodaren', 'Domáca vodáreň'],
  ['tlakova nadoba', 'Tlaková nádoba'],
  ['uv sterilizator', 'UV sterilizátor'],
  ['zmakcovac vody', 'Zmäkčovač vody'],
]

const PHRASE_CORRECTIONS_CZ: [string, string][] = [
  ['flexi hadice', 'Flexi hadice'],
  ['rohovy ventil', 'Rohový ventil'],
  ['kulovy ventil', 'Kulový ventil'],
  ['zpetny ventil', 'Zpětný ventil'],
  ['redukcni ventil', 'Redukční ventil'],
  ['pojistny ventil', 'Pojistný ventil'],
  ['tesnici pasta', 'Těsnicí pasta'],
  ['teflonova paska', 'Teflonová páska'],
  ['gumove tesneni', 'Gumové těsnění'],
  ['montazni pena', 'Montážní pěna'],
  ['izolacni paska', 'Izolační páska'],
  ['lepici paska', 'Lepicí páska'],
  ['ppr trubka', 'PPR trubka'],
  ['pvc trubka', 'PVC trubka'],
  ['cu trubka', 'Cu trubka'],
  ['sdk deska', 'SDK deska'],
  ['osb deska', 'OSB deska'],
  ['wc sedatko', 'WC sedátko'],
  ['wc manzeta', 'WC manžeta'],
  ['wc misa', 'WC mísa'],
  ['wc nadrzka', 'WC nádržka'],
  ['revizni dvirka', 'Revizní dvířka'],
  ['expanzni nadoba', 'Expanzní nádoba'],
  ['proudovy chranic', 'Proudový chránič'],
  ['prepetova ochrana', 'Přepěťová ochrana'],
  ['stahovaci paska', 'Stahovací páska'],
  ['brusny papir', 'Brusný papír'],
  ['malirsky valec', 'Malířský válec'],
  ['zakryvaci folie', 'Zakrývací fólie'],
  ['chemicka kotva', 'Chemická kotva'],
  ['diamantovy kotouc', 'Diamantový kotouč'],
  ['rezny kotouc', 'Řezný kotouč'],
  ['snehova zabrana', 'Sněhová zábrana'],
  ['stresni okno', 'Střešní okno'],
  ['stresni folie', 'Střešní fólie'],
  ['hydroizolacni', 'Hydroizolační'],
  ['nivelacni sterka', 'Nivelační stěrka'],
  ['sparovaci hmota', 'Spárovací hmota'],
  ['obehove cerpadlo', 'Oběhové čerpadlo'],
  ['ponorne cerpadlo', 'Ponorné čerpadlo'],
  ['kalove cerpadlo', 'Kalové čerpadlo'],
  ['domaci vodarna', 'Domácí vodárna'],
  ['tlakova nadoba', 'Tlaková nádoba'],
  ['uv sterilizator', 'UV sterilizátor'],
  ['zmakcovac vody', 'Změkčovač vody'],
]

// ── Single-word corrections ──────────────────────────────────────────────────

/** Map: stripped (no diacritics, lowercase) → correct form (lowercase with diacritics) */
const WORD_MAP_SK: Record<string, string> = {
  // Nouns
  rura: 'rúra', rurka: 'rúrka', sifon: 'sifón', hadica: 'hadica',
  ventil: 'ventil', tesnenie: 'tesnenie', kruzok: 'krúžok', manzeta: 'manžeta',
  objimka: 'objímka', sedatko: 'sedátko', nadrzka: 'nádržka', misa: 'misa',
  bateria: 'batéria', kartusa: 'kartuša', perlator: 'perlator', bojler: 'bojler',
  cerpadlo: 'čerpadlo', vodomer: 'vodomer', filter: 'filter', dvierka: 'dvierka',
  radiator: 'radiátor', hlavica: 'hlavica', srobenie: 'šróbenie', kohut: 'kohút',
  rozdelovac: 'rozdeľovač', termostat: 'termostat', membrana: 'membrána',
  kompresor: 'kompresor', chladivo: 'chladivo', vymennik: 'výmenník',
  elektrodа: 'elektróda', armatúra: 'armatúra', dymovod: 'dymovod',
  istič: 'istič', istic: 'istič', chranic: 'chránič', zasuvka: 'zásuvka',
  vypinac: 'vypínač', kabel: 'kábel', vodic: 'vodič', chranicka: 'chránička',
  krabica: 'krabica', rozvadzac: 'rozvádzač', ziarovka: 'žiarovka',
  svietidlo: 'svietidlo', snimac: 'snímač', zvoncek: 'zvonček', stykac: 'stýkač',
  zamok: 'zámok', klucka: 'kľučka', gula: 'guľa', rozeta: 'rozeta',
  stitok: 'štítok', panty: 'pánty', kukátko: 'kukátko', kluc: 'kľúč',
  skridla: 'škridla', sindel: 'šindeľ', zlabovy: 'žľabový', zvod: 'zvod',
  folia: 'fólia', izolacia: 'izolácia', lepidlo: 'lepidlo',
  penetracia: 'penetrácia', hydroizolacia: 'hydroizolácia',
  stierka: 'stierka', farba: 'farba', tmel: 'tmel', tapeta: 'tapeta',
  omietka: 'omietka', tvarnica: 'tvárnica', malta: 'malta', cement: 'cement',
  beton: 'betón', hmozdinky: 'hmoždinky', hmozdinka: 'hmoždinka',
  skrutka: 'skrutka', skrutky: 'skrutky', pena: 'pena',
  silikon: 'silikón', pasca: 'pasca', detektor: 'detektor',
  paska: 'páska', lista: 'lišta', profil: 'profil', podlozka: 'podložka',
  nadoba: 'nádoba', spinac: 'spínač', svorka: 'svorka',
  // Adjectives
  rohovy: 'rohový', gulovy: 'guľový', spatny: 'spätný', poistny: 'poistný',
  redukcny: 'redukčný', umyvadlovy: 'umývadlový', drezovy: 'drezový',
  vanovy: 'vaňový', sprchovy: 'sprchový', podlahovy: 'podlahový',
  prackovy: 'práčkový', kondenzacny: 'kondenzačný', nastenný: 'nástenný',
  nastavitelny: 'nastaviteľný', automaticky: 'automatický', rucny: 'ručný',
  termostaticky: 'termostatický', termostaticka: 'termostatická',
  digitalny: 'digitálny', programovatelny: 'programovateľný',
  magneticky: 'magnetický', plynovy: 'plynový', plynova: 'plynová',
  bezpecnostny: 'bezpečnostný', bezpecnostna: 'bezpečnostná',
  trojcestny: 'trojcestný', instalacny: 'inštalačný',
  revizne: 'revízne', revizny: 'revízny',
  panelovy: 'panelový', kupelnovy: 'kúpeľňový', rebrikovy: 'rebríkový',
  jednopolovy: 'jednopólový', seriovy: 'sériový', striedavy: 'striedavý',
  schodiskovy: 'schodiskový', krizovy: 'krížový',
  plochy: 'plochý', ocelova: 'oceľová', gumovy: 'gumový',
  pozinkovany: 'pozinkovaný', lakovany: 'lakovaný',
  diamantovy: 'diamantový', ceramicka: 'keramická',
  flexibilna: 'flexibilná', flexibilny: 'flexibilný',
  chromovy: 'chrómový', mosadzny: 'mosadzný',
  plastova: 'plastová', plastovy: 'plastový',
  kovova: 'kovová', kovovy: 'kovový',
  biela: 'biela', biely: 'biely', cierna: 'čierna', cierny: 'čierny',
  cervena: 'červená', zlta: 'žltá', zelena: 'zelená',
  silikónovy: 'silikónový', silikonova: 'silikónová',
  akrylova: 'akrylová', akrylovy: 'akrylový',
  epoxidova: 'epoxidová', cementova: 'cementová',
  sadrovy: 'sádrový', sadrova: 'sádrová',
  vapenna: 'vápenná', stukova: 'štuková',
  stresny: 'strešný', stresna: 'strešná',
  fasadny: 'fasádny', fasadna: 'fasádna',
  interierova: 'interiérová', vonkajsia: 'vonkajšia', vonkajsi: 'vonkajší',
  vnutorna: 'vnútorná', vnutorny: 'vnútorný',
  teflonova: 'teflónová', izolacna: 'izolačná',
  nivelacna: 'nivelačná', nivelacny: 'nivelačný',
  protipoziarny: 'protipožiarny',
  uzatvaraci: 'uzatvárací', samouzatvaraci: 'samouzatvárací',
  // Verbs / participles
  napustaci: 'napúšťací', vypustaci: 'vypúšťací', tesniaci: 'tesniaci',
  ovladaci: 'ovládací', cistiacie: 'čistiaci', cistici: 'čistiaci',
  brusny: 'brúsny', maliarsky: 'maliarsky', zakryvacia: 'zakrývacia',
  samolepiaca: 'samolepiaca', samolepiaci: 'samolepiaci',
  // Common qualifiers
  univerzalny: 'univerzálny', standardny: 'štandardný', standardne: 'štandardné',
}

const WORD_MAP_CZ: Record<string, string> = {
  // Nouns
  trubka: 'trubka', sifon: 'sifon', hadice: 'hadice',
  ventil: 'ventil', tesneni: 'těsnění', krouzek: 'kroužek', manzeta: 'manžeta',
  objimka: 'objímka', sedatko: 'sedátko', nadrzka: 'nádržka', misa: 'mísa',
  baterie: 'baterie', kartuse: 'kartuše', perlator: 'perlátor', bojler: 'bojler',
  cerpadlo: 'čerpadlo', vodomer: 'vodoměr', filtr: 'filtr', dvirka: 'dvířka',
  radiator: 'radiátor', hlavice: 'hlavice', sroubeni: 'šroubení', kohout: 'kohout',
  rozdelovac: 'rozdělovač', termostat: 'termostat', membrana: 'membrána',
  kompresor: 'kompresor', chladivo: 'chladivo', vymenik: 'výměník',
  elektroda: 'elektroda', armatura: 'armatura', kourovod: 'kouřovod',
  jistic: 'jistič', chranic: 'chránič', zasuvka: 'zásuvka',
  vypinac: 'vypínač', kabel: 'kabel', vodic: 'vodič', chranicka: 'chránička',
  krabice: 'krabice', rozvadec: 'rozváděč', zarovka: 'žárovka',
  svitidlo: 'svítidlo', snimac: 'snímač', zvonek: 'zvonek', stykac: 'stykač',
  zamek: 'zámek', klika: 'klika', koule: 'koule', rozeta: 'rozeta',
  stitek: 'štítek', panty: 'panty', kukatko: 'kukátko', klic: 'klíč',
  taska: 'taška', sindel: 'šindel', zlabovy: 'žlabový', svod: 'svod',
  folie: 'fólie', izolace: 'izolace', lepidlo: 'lepidlo',
  penetrace: 'penetrace', hydroizolace: 'hydroizolace',
  sterka: 'stěrka', barva: 'barva', tmel: 'tmel', tapeta: 'tapeta',
  omitka: 'omítka', tvarnice: 'tvárnice', malta: 'malta', cement: 'cement',
  beton: 'beton', hmozdinky: 'hmoždinky', hmozdinka: 'hmoždinka',
  sroub: 'šroub', srouby: 'šrouby', pena: 'pěna',
  silikon: 'silikon', past: 'past', detektor: 'detektor',
  paska: 'páska', lista: 'lišta', profil: 'profil', podlozka: 'podložka',
  nadoba: 'nádoba', spinac: 'spínač', svorka: 'svorka',
  // Adjectives
  rohovy: 'rohový', kulovy: 'kulový', zpetny: 'zpětný', pojistny: 'pojistný',
  redukcni: 'redukční', umyvadlovy: 'umyvadlový', drezovy: 'dřezový',
  vanovy: 'vanový', sprchovy: 'sprchový', podlahovy: 'podlahový',
  prackovy: 'pračkový', kondenzacni: 'kondenzační', nastenny: 'nástěnný',
  nastavitelny: 'nastavitelný', automaticky: 'automatický', rucni: 'ruční',
  termostaticky: 'termostatický', termostaticka: 'termostatická',
  digitalni: 'digitální', programovatelny: 'programovatelný',
  magneticky: 'magnetický', plynovy: 'plynový', plynova: 'plynová',
  bezpecnostni: 'bezpečnostní',
  trojcestny: 'trojcestný', instalacni: 'instalační',
  revizni: 'revizní',
  panelovy: 'panelový', koupelnovy: 'koupelnový', zebrikovy: 'žebříkový',
  jednopolovy: 'jednopólový', seriovy: 'sériový', stridavy: 'střídavý',
  schodistovy: 'schodišťový', krizovy: 'křížový',
  plochy: 'plochý', ocelova: 'ocelová', gumovy: 'gumový',
  pozinkovany: 'pozinkovaný', lakovany: 'lakovaný',
  diamantovy: 'diamantový', keramicka: 'keramická',
  flexibilni: 'flexibilní',
  chromovy: 'chromový', mosazny: 'mosazný',
  plastova: 'plastová', plastovy: 'plastový',
  kovova: 'kovová', kovovy: 'kovový',
  bila: 'bílá', bily: 'bílý', cerna: 'černá', cerny: 'černý',
  cervena: 'červená', zluta: 'žlutá', zelena: 'zelená',
  silikonovy: 'silikonový', silikonova: 'silikonová',
  akrylova: 'akrylová', akrylovy: 'akrylový',
  epoxidova: 'epoxidová', cementova: 'cementová',
  sadrovy: 'sádrový', sadrova: 'sádrová',
  vapenna: 'vápenná', stukova: 'štuková',
  stresni: 'střešní',
  fasadni: 'fasádní',
  interierova: 'interiérová', venkovni: 'venkovní',
  vnitrni: 'vnitřní',
  teflonova: 'teflonová', izolacni: 'izolační',
  nivelacni: 'nivelační',
  protipozarni: 'protipožární',
  uzaviraci: 'uzavírací', samozaviraci: 'samozavírací',
  // Verbs / participles
  napousteci: 'napouštěcí', vypousteci: 'vypouštěcí', tesnici: 'těsnicí',
  ovladaci: 'ovládací', cistici: 'čisticí',
  brusny: 'brusný', malirsky: 'malířský', zakryvaci: 'zakrývací',
  samolepici: 'samolepicí',
  // Common qualifiers
  univerzalni: 'univerzální', standardni: 'standardní',
}

// ── Preserve-case acronyms (always uppercase) ────────────────────────────────

const ACRONYMS = new Set([
  'pvc', 'ppr', 'cu', 'pe', 'hdpe', 'sdk', 'osb', 'wc', 'uv', 'led',
  'dn', 'npt', 'fve', 'dc', 'ac', 'ups', 'ev', 'ip', 'ntc', 'mc4',
])

// ── Public API ────────────────────────────────────────────────────────────────

function strip(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Correct diacritics in a material name.
 *
 * 1. Try multi-word phrase match
 * 2. Correct individual words via dictionary
 * 3. Capitalize first letter of result
 */
export function correctDiacritics(input: string, lang: 'sk' | 'cz'): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed

  const phrases = lang === 'cz' ? PHRASE_CORRECTIONS_CZ : PHRASE_CORRECTIONS_SK
  const words = lang === 'cz' ? WORD_MAP_CZ : WORD_MAP_SK

  // 1. Try phrase match (full input)
  const inputStripped = strip(trimmed)
  for (const [pattern, replacement] of phrases) {
    if (inputStripped === pattern) return replacement
  }

  // 2. Try phrase match (input starts with phrase)
  for (const [pattern, replacement] of phrases) {
    if (inputStripped.startsWith(pattern + ' ')) {
      const rest = trimmed.slice(pattern.length)
      return replacement + correctDiacriticsWords(rest, words)
    }
  }

  // 3. Word-by-word correction
  const result = correctDiacriticsWords(trimmed, words)
  return result
}

function correctDiacriticsWords(input: string, wordMap: Record<string, string>): string {
  return input.replace(/\S+/g, (word) => {
    const stripped = strip(word)

    // Preserve acronyms
    if (ACRONYMS.has(stripped)) return word.toUpperCase()

    // Look up in dictionary
    const corrected = wordMap[stripped]
    if (!corrected) return word  // unknown word — leave as-is

    // Preserve original casing pattern
    if (word === word.toUpperCase()) return corrected.toUpperCase()
    if (word[0] === word[0].toUpperCase()) {
      return corrected[0].toUpperCase() + corrected.slice(1)
    }
    return corrected
  })
}
