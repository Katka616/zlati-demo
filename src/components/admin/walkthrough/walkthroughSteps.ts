/**
 * walkthroughSteps.ts
 * Definícia krokov interaktívneho sprievodcu pre CRM zákazku (job detail).
 * Každý krok cieli na element označený data-walkthrough="[target]".
 */

export interface WalkthroughStep {
  /** Hodnota atribútu data-walkthrough na cieľovom elemente */
  target: string
  /** Nadpis kroku (slovensky) */
  title: string
  /** Popis kroku (slovensky) */
  description: string
  /** Pozícia tooltipu voči cieľovému elementu */
  position: 'top' | 'bottom' | 'left' | 'right'
  /** Padding okolo zvýrazneného elementu v px (default: 8) */
  highlightPadding?: number
}

export const JOB_DETAIL_STEPS: WalkthroughStep[] = [
  {
    target: 'job-header',
    title: '1. Hlavička zákazky',
    description:
      'Referenčné číslo, poisťovňa, kategória a naliehavosť. Väčšinu údajov môžete editovať priamo kliknutím — nemusíte otvárať žiadny formulár.',
    position: 'bottom',
  },
  {
    target: 'operator-badge',
    title: '2. Priradený operátor',
    description:
      'Ukazuje, kto zákazku vybavuje. Kliknite na meno pre zmenu operátora. Systém automaticky zaznamenáva históriu priradení.',
    position: 'bottom',
  },
  {
    target: 'status-pipeline',
    title: '3. Pipeline — životný cyklus zákazky',
    description:
      '13 krokov od Príjmu po Uzavretie. Kliknite na krok pre posun vpred. Ak potrebujete vrátiť zákazku späť, systém si vyžiada dôvod — to je úmyselné, aby sa predišlo chybám.',
    position: 'bottom',
  },
  {
    target: 'context-action-panel',
    title: '4. Čo robiť teraz?',
    description:
      'Tento panel sa mení podľa stavu zákazky a vždy zobrazuje konkrétnu ďalšiu akciu — napr. "Priradiť technika", "Skontrolovať odhad" alebo "Odoslať EA odhlášku". Nemusíte premýšľať, čo je ďalší krok.',
    position: 'bottom',
  },
  {
    target: 'inline-edit-demo',
    title: '5. Priama editácia polí',
    description:
      'Skúste kliknúť na hodnotu poľa — otvorí sa editácia priamo na mieste. Enter uloží, Escape zruší. Funguje to na väčšine polí v celom detaile zákazky.',
    position: 'right',
  },
  {
    target: 'customer-sidebar',
    title: '6. Zákazník — vždy po ruke',
    description:
      'Kontaktné údaje zákazníka sú vždy viditeľné v pravom paneli, bez ohľadu na to, kde na stránke ste. Telefónne číslo je klikateľné pre priame vytočenie.',
    position: 'left',
  },
  {
    target: 'technician-section',
    title: '7. Technik a priradenie',
    description:
      'Tu vidíte priradeného technika, jeho vzdialenosť a hodnotenie. Tlačidlom "Spustiť matching" systém nájde najbližších vhodných technikov podľa špecializácie a dostupnosti.',
    position: 'bottom',
  },
  {
    target: 'pricing-section',
    title: '8. Ceny a marža',
    description:
      'Cenový engine automaticky počíta cenu pre poisťovňu, platbu technikovi a maržu. Hodnoty sa aktualizujú pri zmene odhadu alebo po odoslaní protokolu technikom.',
    position: 'bottom',
  },
  {
    target: 'photos-sidebar',
    title: '9. Fotodokumentácia',
    description:
      'Fotky pred / počas / po oprave, ktoré nahrál technik. Kliknite na náhľad pre zväčšenie. AI automaticky kontroluje fotky pred a po — ak niečo nesedí, zobrazí sa upozornenie.',
    position: 'left',
  },
  {
    target: 'quick-actions',
    title: '10. Rýchle akcie',
    description:
      'Odtiaľto viete volať zákazníkovi alebo technikovi jedným kliknutím, otvoriť chat, alebo znova spustiť tohto sprievodcu kedykoľvek cez tlačidlo ❓.',
    position: 'bottom',
  },
]

export const CHAT_STEPS: WalkthroughStep[] = [
  {
    target: 'chat-filter-tabs',
    title: 'Filtrovanie konverzácií',
    description: 'Prepínajte medzi záložkami: Všetko (všetky konverzácie), Moje (priradené vám), Zásah (vyžadujú reakciu operátora), AI (riešené chatbotom).',
    position: 'bottom',
  },
  {
    target: 'chat-search',
    title: 'Vyhľadávanie',
    description: 'Hľadajte podľa mena zákazníka, čísla zákazky alebo textu správy. Výsledky sa filtrujú okamžite.',
    position: 'bottom',
  },
  {
    target: 'chat-conversation-list',
    title: 'Zoznam konverzácií',
    description: 'Konverzácie sú rozdelené do sekcií: Pripnuté, Vyžaduje zásah, Moje aktívne, Nedávne a Hotové. Kliknite na konverzáciu pre jej otvorenie.',
    position: 'right',
  },
  {
    target: 'chat-thread',
    title: 'Vlákno správ',
    description: 'Tu vidíte celú históriu komunikácie so zákazníkom a technikom. Správy sú farebne odlíšené podľa odosielateľa.',
    position: 'left',
  },
  {
    target: 'chat-compose',
    title: 'Odosielanie správ',
    description: 'Napíšte správu zákazníkovi alebo technikovi. AI vám môže navrhnúť odpoveď — stačí ju schváliť alebo upraviť.',
    position: 'top',
  },
  {
    target: 'chat-context-panel',
    title: 'Kontext zákazky',
    description: 'Pravý panel zobrazuje detail zákazky, stav, priradeného technika a ďalšie informácie relevantné pre konverzáciu.',
    position: 'left',
  },
  {
    target: 'chat-command-palette',
    title: 'Rýchle príkazy (Ctrl+K)',
    description: 'Stlačte Ctrl+K pre rýchle vyhľadávanie zákaziek, technikov alebo prepnutie konverzácie. Funguje z akéhokoľvek miesta v chate.',
    position: 'bottom',
  },
]
