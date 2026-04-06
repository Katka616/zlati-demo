/**
 * Portal FAQ content — 17 questions in 4 sections, filtered by phase.
 * Also contains "What's happening now" info per phase.
 *
 * Languages: CZ (default), SK, EN
 */

import type { PortalLang } from '@/components/portal/portalLocale'

export type PortalPhaseKey =
  | 'diagnostic'
  | 'technician'
  | 'in_progress'
  | 'ordering_parts'
  | 'surcharge'
  | 'protocol'
  | 'rating'
  | 'closed'

export interface FaqEntry {
  id: string
  question: Record<PortalLang, string>
  answer: Record<PortalLang, string>
  /** If undefined — show in all phases. Otherwise show only in listed phases. */
  phases?: PortalPhaseKey[]
}

export interface FaqSection {
  id: string
  title: Record<PortalLang, string>
  icon: string
  entries: FaqEntry[]
}

export interface NextStepInfo {
  icon: string
  title: Record<PortalLang, string>
  description: Record<PortalLang, string>
}

// ─── FAQ Sections ──────────────────────────────────────────────────────────

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'about_service',
    title: {
      cz: 'O asistenční službě',
      sk: 'O asistenčnej službe',
      en: 'About the assistance service',
    },
    icon: 'ℹ️',
    entries: [
      {
        id: 'what_is_surcharge',
        question: {
          cz: 'Co je doplatek?',
          sk: 'Čo je doplatok?',
          en: 'What is a surcharge?',
        },
        answer: {
          cz: 'Vaše pojišťovna hradí standardní rozsah opravy. Pokud práce přesahuje vaše pojistné krytí, rozdíl hradíte vy. Celkovou sumu vždy předem schvalujete — nic se nestrhne bez vašeho souhlasu.',
          sk: 'Vaša poisťovňa hradí štandardný rozsah opravy. Ak práca presahuje vaše poistné krytie, rozdiel platíte vy. Celkovú sumu vždy vopred schvaľujete — nič sa nestrhne bez vášho súhlasu.',
          en: 'Your insurance covers the standard scope of repair. If the work exceeds your coverage, you pay the difference. You always approve the total amount in advance — nothing is charged without your consent.',
        },
      },
      {
        id: 'who_calls_me',
        question: {
          cz: 'Proč mi někdo volal?',
          sk: 'Prečo mi niekto volal?',
          en: 'Why did someone call me?',
        },
        answer: {
          cz: 'Automatické připomínky vás kontaktují, když je potřeba vaše akce — například vyplnit formulář nebo potvrdit termín. Nejde o spam, ale o informaci týkající se vaší zákazky.',
          sk: 'Automatické pripomienky vás kontaktujú, keď je potrebná vaša akcia — napríklad vyplniť formulár alebo potvrdiť termín. Nejde o spam, ale o informáciu týkajúcu sa vašej zákazky.',
          en: 'Automated reminders contact you when your action is needed — for example to fill in a form or confirm an appointment. This is not spam, but a notification related to your job.',
        },
      },
      {
        id: 'is_tech_verified',
        question: {
          cz: 'Je technik ověřený?',
          sk: 'Je technik overený?',
          en: 'Is the technician verified?',
        },
        answer: {
          cz: 'Ano. Každý technik je prověřen asistenční společností a má platnou kvalifikaci pro svůj obor. Techniky pravidelně hodnotíme a kontrolujeme.',
          sk: 'Áno. Každý technik je preverený asistenčnou spoločnosťou a má platnú kvalifikáciu pre svoj obor. Technikov pravidelne hodnotíme a kontrolujeme.',
          en: 'Yes. Every technician is verified by the assistance company and holds a valid qualification in their trade. We regularly rate and review our technicians.',
        },
      },
      {
        id: 'can_cancel',
        question: {
          cz: 'Mohu zákazku zrušit?',
          sk: 'Môžem zákazku zrušiť?',
          en: 'Can I cancel the job?',
        },
        answer: {
          cz: 'Ano, pokud problém pominul. Ve fázi 1–2 použijte tlačítko „Problém se vyřešil". V pozdějších fázích nás prosím kontaktujte přes chat — technik může být již na cestě.',
          sk: 'Áno, ak problém pominul. Vo fáze 1–2 použite tlačidlo „Problém sa vyriešil". V neskorších fázach nás prosím kontaktujte cez chat — technik môže byť už na ceste.',
          en: 'Yes, if the issue has resolved itself. In phases 1–2, use the "Issue resolved" button. In later phases, please contact us via chat — the technician may already be on the way.',
        },
        phases: ['diagnostic', 'technician', 'in_progress'],
      },
      {
        id: 'when_invoice',
        question: {
          cz: 'Kdy dostanu fakturu?',
          sk: 'Kedy dostanem faktúru?',
          en: 'When will I receive the invoice?',
        },
        answer: {
          cz: 'Faktura se vystavuje po podpisu protokolu. Pokud jste zadali e-mailovou adresu, obdržíte ji e-mailem. Doplatek (pokud existuje) hradíte dle dohody s asistenční společností.',
          sk: 'Faktúra sa vystavuje po podpise protokolu. Ak ste zadali e-mailovú adresu, dostanete ju e-mailom. Doplatok (ak existuje) hradíte podľa dohody s asistenčnou spoločnosťou.',
          en: 'The invoice is issued after the protocol is signed. If you provided an email address, it will be sent there. Any surcharge (if applicable) is paid according to your agreement with the assistance company.',
        },
        phases: ['protocol', 'rating', 'closed'],
      },
      {
        id: 'warranty',
        question: {
          cz: 'Co když se problém vrátí?',
          sk: 'Čo ak sa problém vráti?',
          en: 'What if the issue returns?',
        },
        answer: {
          cz: 'V případě reklamace kontaktujte přímo vaši pojišťovnu nebo asistenční společnost. Reklamace se řeší přes ně — mají přístup k záznamu celé zakázky.',
          sk: 'V prípade reklamácie kontaktujte priamo vašu poisťovňu alebo asistenčnú spoločnosť. Reklamácie sa riešia cez nich — majú prístup k záznamu celej zákazky.',
          en: 'In case of a complaint, contact your insurance company or assistance company directly. Complaints are handled through them — they have access to the full job record.',
        },
        phases: ['rating', 'closed'],
      },
    ],
  },

  {
    id: 'repair_progress',
    title: {
      cz: 'Průběh opravy',
      sk: 'Priebeh opravy',
      en: 'Repair progress',
    },
    icon: '🔧',
    entries: [
      {
        id: 'when_tech_arrives',
        question: {
          cz: 'Kdy přijde technik?',
          sk: 'Kedy príde technik?',
          en: 'When will the technician arrive?',
        },
        answer: {
          cz: 'Portál zobrazuje stav v reálném čase. „Na cestě" znamená, že technik vyrazil. Přesný čas není možné zaručit kvůli dopravě. Techniky sledujeme a v případě problému vás kontaktujeme.',
          sk: 'Portál zobrazuje stav v reálnom čase. „Na ceste" znamená, že technik vyrazil. Presný čas nie je možné zaručiť kvôli doprave. Technikov sledujeme a v prípade problému vás kontaktujeme.',
          en: 'The portal shows the status in real time. "On the way" means the technician has set off. An exact arrival time cannot be guaranteed due to traffic. We monitor our technicians and will contact you if there is an issue.',
        },
        phases: ['technician', 'in_progress'],
      },
      {
        id: 'tech_not_arrived',
        question: {
          cz: 'Technik nepřišel — co mám dělat?',
          sk: 'Technik neprišiel — čo mám robiť?',
          en: 'The technician did not arrive — what should I do?',
        },
        answer: {
          cz: 'Napište nám přes chat (tlačítko vpravo dole). Operátor situaci okamžitě prověří a dá vám zpět. Prosíme o trpělivost — někdy dochází ke zdržení kvůli předchozí zákazce.',
          sk: 'Napíšte nám cez chat (tlačidlo vpravo dole). Operátor situáciu okamžite preverí a dá vám späť. Prosíme o trpezlivosť — niekedy dochádza k zdržaniu kvôli predchádzajúcej zákazke.',
          en: 'Write to us via chat (button in the bottom right). The operator will immediately check the situation and get back to you. Please be patient — sometimes delays occur due to a previous job.',
        },
        phases: ['technician', 'in_progress'],
      },
    ],
  },

  {
    id: 'surcharge_section',
    title: {
      cz: 'Doplatek',
      sk: 'Doplatok',
      en: 'Surcharge',
    },
    icon: '💰',
    entries: [
      {
        id: 'surcharge_decline_consequence',
        question: {
          cz: 'Co se stane, když nesouhlasím?',
          sk: 'Čo sa stane, ak nesúhlasím?',
          en: 'What happens if I disagree?',
        },
        answer: {
          cz: 'Technik dokončí pouze práce kryté pojistkou. Oprava může být částečná. Asistenční společnost vás bude kontaktovat ohledně dalšího postupu.',
          sk: 'Technik dokončí len práce kryté poistkou. Oprava môže byť čiastočná. Asistenčná spoločnosť vás bude kontaktovať ohľadom ďalšieho postupu.',
          en: 'The technician will complete only the work covered by your insurance. The repair may be partial. The assistance company will contact you regarding the next steps.',
        },
        phases: ['surcharge'],
      },
      {
        id: 'surcharge_why',
        question: {
          cz: 'Proč platím doplatek?',
          sk: 'Prečo platím doplatok?',
          en: 'Why am I paying a surcharge?',
        },
        answer: {
          cz: 'Vaše pojistné krytí má limit. Suma nad tento limit je doplatek. Přesný rozpis vidíte v cenové nabídce — co platí pojišťovna a co je váš příplatek.',
          sk: 'Vaše poistné krytie má limit. Suma nad tento limit je doplatok. Presný rozpis vidíte v cenovej ponuke — čo platí poisťovňa a čo je váš príplatok.',
          en: 'Your insurance coverage has a limit. The amount above this limit is the surcharge. You can see the exact breakdown in the price quote — what the insurer pays and what your contribution is.',
        },
        phases: ['surcharge'],
      },
      {
        id: 'surcharge_time',
        question: {
          cz: 'Kolik mám času na rozhodnutí?',
          sk: 'Koľko mám času na rozhodnutie?',
          en: 'How much time do I have to decide?',
        },
        answer: {
          cz: 'Technik čeká na místě. Rozhodněte se co nejdříve — každá hodina čekání znamená prodloužení zakázky. Pokud potřebujete více informací, napište přes chat.',
          sk: 'Technik čaká na mieste. Rozhodnite sa čo najskôr — každá hodina čakania znamená predĺženie zákazky. Ak potrebujete viac informácií, napíšte cez chat.',
          en: 'The technician is waiting on site. Please decide as soon as possible — every hour of waiting extends the job. If you need more information, write via chat.',
        },
        phases: ['surcharge'],
      },
      {
        id: 'surcharge_payment',
        question: {
          cz: 'Kdy a jak zaplatím?',
          sk: 'Kedy a ako zaplatím?',
          en: 'When and how do I pay?',
        },
        answer: {
          cz: 'Podpisem zde pouze souhlasíte se sumou. Způsob a termín úhrady doplatku závisí na dohodě s vaší asistenční společností — kontaktují vás samostatně.',
          sk: 'Podpisom tu len súhlasíte so sumou. Spôsob a termín úhrady doplatku závisí na dohode s vašou asistenčnou spoločnosťou — kontaktujú vás samostatne.',
          en: 'By signing here you are only agreeing to the amount. The payment method and timing for the surcharge depends on your agreement with the assistance company — they will contact you separately.',
        },
        phases: ['surcharge'],
      },
    ],
  },

  {
    id: 'protocol_section',
    title: {
      cz: 'Protokol a podpis',
      sk: 'Protokol a podpis',
      en: 'Protocol and signature',
    },
    icon: '📋',
    entries: [
      {
        id: 'how_to_sign',
        question: {
          cz: 'Jak se podepíšu?',
          sk: 'Ako sa podpíšem?',
          en: 'How do I sign?',
        },
        answer: {
          cz: 'Nakreslete podpis prstem v rámečku. Pokud se nepodaří, klikněte „Smazat" a zkuste znovu. Podpis nemusí být dokonalý — stačí rozpoznatelný.',
          sk: 'Nakreslite podpis prstom v rámčeku. Ak sa nepodarí, kliknite „Vymazať" a skúste znova. Podpis nemusí byť dokonalý — stačí rozpoznateľný.',
          en: 'Draw your signature with your finger in the box. If it does not work, click "Clear" and try again. The signature does not need to be perfect — just recognisable.',
        },
        phases: ['protocol'],
      },
      {
        id: 'must_sign',
        question: {
          cz: 'Musím podepsat?',
          sk: 'Musím podpísať?',
          en: 'Do I have to sign?',
        },
        answer: {
          cz: 'Podpis potvrzuje převzetí práce. Pokud máte námitky k rozsahu nebo kvalitě opravy, napište je do chatu před podpisem — operátor to zaznamená.',
          sk: 'Podpis potvrdzuje prevzatie práce. Ak máte námietky k rozsahu alebo kvalite opravy, napíšte ich do chatu pred podpisom — operátor ich zaznamená do záznamu.',
          en: 'The signature confirms acceptance of the work. If you have objections to the scope or quality of the repair, write them in the chat before signing — the operator will add them to the record.',
        },
        phases: ['protocol'],
      },
      {
        id: 'protocol_copy',
        question: {
          cz: 'Dostanu kopii protokolu?',
          sk: 'Dostanem kópiu protokolu?',
          en: 'Will I receive a copy of the protocol?',
        },
        answer: {
          cz: 'Ano, pokud jste zadali e-mail — kopie přijde automaticky. Protokol si také můžete stáhnout jako PDF přímo z portálu pomocí tlačítka „Stáhnout protokol".',
          sk: 'Áno, ak ste zadali e-mail — kópia príde automaticky. Protokol si tiež môžete stiahnuť ako PDF priamo z portálu pomocou tlačidla „Stiahnuť protokol".',
          en: 'Yes, if you provided an email address — the copy will be sent automatically. You can also download the protocol as a PDF directly from the portal using the "Download protocol" button.',
        },
        phases: ['protocol', 'rating', 'closed'],
      },
    ],
  },
]

// ─── Next Step Info per phase ──────────────────────────────────────────────

export const NEXT_STEP_INFO: Record<PortalPhaseKey, NextStepInfo> = {
  diagnostic: {
    icon: '🔍',
    title: {
      cz: 'Hledáme pro vás technika',
      sk: 'Hľadáme pre vás technika',
      en: 'Finding a technician for you',
    },
    description: {
      cz: 'Dostanete SMS, jakmile bude technik přiřazen k vaší zákazce.',
      sk: 'Dostanete SMS, keď bude technik pridelený k vašej zákazke.',
      en: 'You will receive an SMS as soon as a technician is assigned to your job.',
    },
  },
  technician: {
    icon: '👷',
    title: {
      cz: 'Technik je přiřazen',
      sk: 'Technik je pridelený',
      en: 'Technician is assigned',
    },
    description: {
      cz: 'Technik se brzy ozve a dohodne termín příjezdu. Sledujte portál pro aktuální stav.',
      sk: 'Technik sa čoskoro ozve a dohodne termín príjazdu. Sledujte portál pre aktuálny stav.',
      en: 'The technician will be in touch shortly to arrange the arrival time. Track the portal for live status.',
    },
  },
  in_progress: {
    icon: '🔧',
    title: {
      cz: 'Oprava probíhá',
      sk: 'Oprava prebieha',
      en: 'Repair in progress',
    },
    description: {
      cz: 'Technik pracuje na opravě. Stav se aktualizuje automaticky.',
      sk: 'Technik pracuje na oprave. Stav sa aktualizuje automaticky.',
      en: 'The technician is working on the repair. Status updates automatically.',
    },
  },
  ordering_parts: {
    icon: '📦',
    title: {
      cz: 'Objednáváme náhradní díly',
      sk: 'Objednávame náhradné diely',
      en: 'Ordering spare parts',
    },
    description: {
      cz: 'Technik dokončil diagnostiku a objednává potřebné díly. Jakmile budou k dispozici, naplánujeme další návštěvu.',
      sk: 'Technik dokončil diagnostiku a objednáva potrebné diely. Keď budú k dispozícii, naplánujeme ďalšiu návštevu.',
      en: 'The technician has completed diagnostics and is ordering the necessary parts. Once available, we will schedule the next visit.',
    },
  },
  surcharge: {
    icon: '💰',
    title: {
      cz: 'Čeká na vaše rozhodnutí',
      sk: 'Čaká na vaše rozhodnutie',
      en: 'Waiting for your decision',
    },
    description: {
      cz: 'Technik čeká na místě. Přečtěte si nabídku a co nejdříve potvrďte nebo odmítněte doplatek.',
      sk: 'Technik čaká na mieste. Prečítajte si ponuku a čo najskôr potvrďte alebo odmietnite doplatok.',
      en: 'The technician is waiting on site. Read the offer and confirm or decline the surcharge as soon as possible.',
    },
  },
  protocol: {
    icon: '📋',
    title: {
      cz: 'Oprava dokončena',
      sk: 'Oprava dokončená',
      en: 'Repair completed',
    },
    description: {
      cz: 'Podepište protokol pro uzavření zákazky. Tím potvrzujete převzetí provedené práce.',
      sk: 'Podpíšte protokol pre uzavretie zákazky. Tým potvrdzujete prevzatie vykonanej práce.',
      en: 'Sign the protocol to close the job. This confirms your acceptance of the completed work.',
    },
  },
  rating: {
    icon: '⭐',
    title: {
      cz: 'Ohodnoťte službu',
      sk: 'Ohodnoťte službu',
      en: 'Rate the service',
    },
    description: {
      cz: 'Vaše hodnocení pomáhá zlepšovat kvalitu služeb.',
      sk: 'Vaše hodnotenie pomáha zlepšovať kvalitu služieb.',
      en: 'Your rating helps us improve the quality of our services.',
    },
  },
  closed: {
    icon: '✅',
    title: {
      cz: 'Zákazka uzavřena',
      sk: 'Zákazka uzavretá',
      en: 'Job closed',
    },
    description: {
      cz: 'Děkujeme za důvěru.',
      sk: 'Ďakujeme za dôveru.',
      en: 'Thank you for your trust.',
    },
  },
}

// ─── Helper: get FAQ entries relevant to current phase (put relevant first) ──

export function getFaqForPhase(phase: PortalPhaseKey): FaqEntry[] {
  const relevant: FaqEntry[] = []
  const general: FaqEntry[] = []

  for (const section of FAQ_SECTIONS) {
    for (const entry of section.entries) {
      if (!entry.phases) {
        general.push(entry)
      } else if (entry.phases.includes(phase)) {
        relevant.push(entry)
      }
    }
  }

  return [...relevant, ...general]
}

/** Get all sections, with entries filtered to include only those matching the phase or with no phase filter */
export function getSectionsForPhase(phase: PortalPhaseKey): FaqSection[] {
  return FAQ_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.filter(
      (e) => !e.phases || e.phases.includes(phase)
    ),
  })).filter((s) => s.entries.length > 0)
}
