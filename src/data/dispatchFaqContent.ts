/**
 * FAQ content for the Dispatch app.
 * 20 questions in 5 categories, localized SK + CZ.
 */

import type { Lang } from './helpContent'

export interface DispatchFaqEntry {
  id: string
  question: Record<Lang, string>
  answer: Record<Lang, string>
}

export interface DispatchFaqCategory {
  id: string
  icon: string
  label: Record<Lang, string>
  entries: DispatchFaqEntry[]
}

export const DISPATCH_FAQ: DispatchFaqCategory[] = [
  {
    id: 'payments',
    icon: '💰',
    label: { sk: 'Zákazky a platby', cz: 'Zakázky a platby' },
    entries: [
      {
        id: 'settlement_flow',
        question: {
          sk: 'Ako funguje vyúčtovanie?',
          cz: 'Jak funguje vyúčtování?',
        },
        answer: {
          sk: 'Po odoslaní protokolu dispečer skontroluje výkaz. Vyúčtovanie dostanete do 24 hodín. Platba prebehne v najbližší piatok na váš IBAN.',
          cz: 'Po odeslání protokolu dispečer zkontroluje výkaz. Vyúčtování dostanete do 24 hodin. Platba proběhne v nejbližší pátek na váš IBAN.',
        },
      },
      {
        id: 'payment_when',
        question: {
          sk: 'Kedy dostanem zaplatené?',
          cz: 'Kdy dostanu zaplaceno?',
        },
        answer: {
          sk: 'Platby sa spracovávajú každý piatok. Po schválení vyúčtovania dostanete platbu na registrovaný IBAN v najbližší piatok.',
          cz: 'Platby se zpracovávají každý pátek. Po schválení vyúčtování dostanete platbu na registrovaný IBAN v nejbližší pátek.',
        },
      },
      {
        id: 'job_disappeared',
        question: {
          sk: 'Prečo mi zákazka zmizla z ponúk?',
          cz: 'Proč mi zakázka zmizela z nabídek?',
        },
        answer: {
          sk: 'Iný technik ju prijal rýchlejšie. Zákazky sú ponúknuté viacerým technikom súčasne — kto prvý prijme, ten ju dostane.',
          cz: 'Jiný technik ji přijal rychleji. Zakázky jsou nabízeny více technikům současně — kdo první přijme, ten ji dostane.',
        },
      },
      {
        id: 'client_declined_surcharge',
        question: {
          sk: 'Čo ak klient odmietol doplatkovú zmluvu?',
          cz: 'Co když klient odmítl doplatek?',
        },
        answer: {
          sk: 'Zákazka prejde do stavu "pozastavená". Dispečer vás kontaktuje s pokynmi — buď zákazku uzavriete v rozsahu krytia, alebo počkáte na rozhodnutie klienta.',
          cz: 'Zakázka přejde do stavu "pozastavená". Dispečer vás kontaktuje s pokyny — buď zakázku uzavřete v rozsahu krytí, nebo počkáte na rozhodnutí klienta.',
        },
      },
      {
        id: 'upload_invoice',
        question: {
          sk: 'Ako nahrám faktúru?',
          cz: 'Jak nahraju fakturu?',
        },
        answer: {
          sk: 'V detaile zákazky nájdite sekciu "Fakturácia". Kliknite na "Nahrať faktúru" a vyberte PDF alebo fotku. Faktúru je možné aj vyplniť priamo vo formulári.',
          cz: 'V detailu zakázky najděte sekci "Fakturace". Klikněte na "Nahrát fakturu" a vyberte PDF nebo fotku. Fakturu lze také vyplnit přímo ve formuláři.',
        },
      },
    ],
  },
  {
    id: 'protocol',
    icon: '📋',
    label: { sk: 'Protokol', cz: 'Protokol' },
    entries: [
      {
        id: 'client_wont_sign',
        question: {
          sk: 'Čo ak klient nechce podpísať?',
          cz: 'Co když klient nechce podepsat?',
        },
        answer: {
          sk: 'Opýtajte sa klienta na dôvod. Ak trvá na odmietnutí, kontaktujte dispečera cez chat. NEOPÚŠŤAJTE miesto bez podpísaného protokolu. Ofoťte situáciu.',
          cz: 'Zeptejte se klienta na důvod. Pokud trvá na odmítnutí, kontaktujte dispečera přes chat. NEOPOUŠTĚJTE místo bez podepsaného protokolu. Ofoťte situaci.',
        },
      },
      {
        id: 'illegible_signature',
        question: {
          sk: 'Nečitateľný podpis — je to OK?',
          cz: 'Nečitelný podpis — je to OK?',
        },
        answer: {
          sk: 'Áno, podpis je právne platný aj keď nie je čitateľný. Dôležité je vyplnené meno klienta v textovom poli.',
          cz: 'Ano, podpis je právně platný i když není čitelný. Důležité je vyplněné jméno klienta v textovém poli.',
        },
      },
      {
        id: 'forgot_photos',
        question: {
          sk: 'Zabudol som pridať fotky — čo teraz?',
          cz: 'Zapomněl jsem přidat fotky — co teď?',
        },
        answer: {
          sk: 'Kontaktujte dispečera cez chat. Fotky je možné pridať dodatočne. Môžete ich poslať aj priamo cez chat.',
          cz: 'Kontaktujte dispečera přes chat. Fotky lze přidat dodatečně. Můžete je poslat také přímo přes chat.',
        },
      },
      {
        id: 'protocol_mistake',
        question: {
          sk: 'Chyba v odoslanom protokole — ako opraviť?',
          cz: 'Chyba v odeslaném protokolu — jak opravit?',
        },
        answer: {
          sk: 'Kontaktujte dispečera cez chat s popisom opravy. Dispečer môže protokol upraviť v admin systéme.',
          cz: 'Kontaktujte dispečera přes chat s popisem opravy. Dispečer může protokol upravit v admin systému.',
        },
      },
    ],
  },
  {
    id: 'technical',
    icon: '📱',
    label: { sk: 'Technika a offline', cz: 'Technika a offline' },
    entries: [
      {
        id: 'offline_mode',
        question: {
          sk: 'Ako funguje offline režim?',
          cz: 'Jak funguje offline režim?',
        },
        answer: {
          sk: 'Aplikácia ukladá vaše akcie do fronty keď ste offline. Po obnovení pripojenia sa všetky akcie (zmeny stavu, správy) automaticky synchronizujú.',
          cz: 'Aplikace ukládá vaše akce do fronty, když jste offline. Po obnovení připojení se všechny akce (změny stavu, zprávy) automaticky synchronizují.',
        },
      },
      {
        id: 'gps_not_working',
        question: {
          sk: 'GPS poloha sa nezobrazuje',
          cz: 'GPS poloha se nezobrazuje',
        },
        answer: {
          sk: 'Povoľte prístup k polohe v nastaveniach prehliadača. Na iOS musíte vybrať "Povoliť počas používania". Ikona GPS v hlavičke ukazuje aktuálny stav.',
          cz: 'Povolte přístup k poloze v nastavení prohlížeče. Na iOS musíte vybrat "Povolit během používání". Ikona GPS v záhlaví ukazuje aktuální stav.',
        },
      },
      {
        id: 'push_not_working',
        question: {
          sk: 'Push notifikácie nefungujú',
          cz: 'Push notifikace nefungují',
        },
        answer: {
          sk: 'Choďte do Nastavenia → Notifikácie. Na iOS musíte najprv pridať appku na plochu (PWA inštalácia). Na Androide overte povolenia v nastaveniach telefónu.',
          cz: 'Jděte do Nastavení → Notifikace. Na iOS musíte nejprve přidat aplikaci na plochu (PWA instalace). Na Androidu ověřte oprávnění v nastavení telefonu.',
        },
      },
      {
        id: 'job_not_showing',
        question: {
          sk: 'Zákazka sa nezobrazuje v aplikácii',
          cz: 'Zakázka se nezobrazuje v aplikaci',
        },
        answer: {
          sk: 'Potiahnite nadol pre obnovenie alebo kliknite na ikonu reload. Ak stále chýba, kontaktujte dispečera — zákazka mohla byť preradená alebo zrušená.',
          cz: 'Táhněte dolů pro obnovení nebo klikněte na ikonu reload. Pokud stále chybí, kontaktujte dispečera — zakázka mohla být přeřazena nebo zrušena.',
        },
      },
    ],
  },
  {
    id: 'profile',
    icon: '👤',
    label: { sk: 'Profil a dokumenty', cz: 'Profil a dokumenty' },
    entries: [
      {
        id: 'upload_documents',
        question: {
          sk: 'Ako nahrám živnostenský list alebo OP?',
          cz: 'Jak nahraju živnostenský list nebo OP?',
        },
        answer: {
          sk: 'Choďte do Profil → Dokumenty → vyberte typ dokumentu → nahrajte fotku alebo PDF.',
          cz: 'Jděte do Profil → Dokumenty → vyberte typ dokumentu → nahrajte fotku nebo PDF.',
        },
      },
      {
        id: 'change_bank',
        question: {
          sk: 'Zmena bankového účtu',
          cz: 'Změna bankovního účtu',
        },
        answer: {
          sk: 'Choďte do Profil → Bankový účet → upravte IBAN → uložte. Zmena sa prejaví od najbližšej platby.',
          cz: 'Jděte do Profil → Bankovní účet → upravte IBAN → uložte. Změna se projeví od nejbližší platby.',
        },
      },
      {
        id: 'ratings_update',
        question: {
          sk: 'Kedy sa aktualizujú moje hodnotenia?',
          cz: 'Kdy se aktualizují moje hodnocení?',
        },
        answer: {
          sk: 'Po uzavretí každej zákazky môže klient zanechať hodnotenie. Váš priemer sa zobrazuje v profile.',
          cz: 'Po uzavření každé zakázky může klient zanechat hodnocení. Váš průměr se zobrazuje v profilu.',
        },
      },
    ],
  },
  {
    id: 'schedule',
    icon: '📅',
    label: { sk: 'Termín', cz: 'Termín' },
    entries: [
      {
        id: 'reschedule_how',
        question: {
          sk: 'Ako funguje zmena termínu?',
          cz: 'Jak funguje změna termínu?',
        },
        answer: {
          sk: 'V detaile zákazky použite "Zmeniť termín" → vyberte dôvod → zadajte nový dátum/čas → odošlite. Klient dostane notifikáciu na schválenie.',
          cz: 'V detailu zakázky použijte "Změnit termín" → vyberte důvod → zadejte nové datum/čas → odešlete. Klient dostane notifikaci ke schválení.',
        },
      },
      {
        id: 'counter_proposal',
        question: {
          sk: 'Klient navrhol iný termín',
          cz: 'Klient navrhl jiný termín',
        },
        answer: {
          sk: 'Dostanete notifikáciu. Otvorte zákazku → sekcia Zmena termínu → prijmite alebo navrhnite ďalší termín.',
          cz: 'Dostanete notifikaci. Otevřete zakázku → sekce Změna termínu → přijměte nebo navrhněte další termín.',
        },
      },
      {
        id: 'reschedule_deadline',
        question: {
          sk: 'Do kedy musím odpovedať na zmenu termínu?',
          cz: 'Do kdy musím odpovědět na změnu termínu?',
        },
        answer: {
          sk: 'Žiadosť o zmenu termínu vyprší za 24 hodín. Po vypršaní zostane pôvodný termín v platnosti.',
          cz: 'Žádost o změnu termínu vyprší za 24 hodin. Po vypršení zůstane původní termín v platnosti.',
        },
      },
      {
        id: 'schedule_missing',
        question: {
          sk: 'Zákazka nemá termín — čo robiť?',
          cz: 'Zakázka nemá termín — co dělat?',
        },
        answer: {
          sk: 'Kontaktujte dispečera cez chat. Termín bude dohodnutý s klientom a priradený.',
          cz: 'Kontaktujte dispečera přes chat. Termín bude dohodnut s klientem a přiřazen.',
        },
      },
    ],
  },
]
