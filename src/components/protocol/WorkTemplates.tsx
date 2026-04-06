'use client'

import { useState, useMemo } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Template {
  cat: string
  icon: string
  title: string
  text: string
}

const TEMPLATES: Template[] = [
  // INSTALATÉR
  { cat: 'Instalatér', icon: '🔧', title: 'Oprava prasklého potrubí',
    text: 'Provedena oprava prasklého potrubí v koupelně/kuchyni. Lokalizován únik vody, uzavřen přívod, demontována poškozená část potrubí. Provedena výměna poškozeného úseku za nové potrubí. Zkontrolována těsnost spojů, obnovena dodávka vody. Místo uvedeno do původního stavu.' },
  { cat: 'Instalatér', icon: '🚿', title: 'Výměna baterie / směšovače',
    text: 'Provedena demontáž stávající baterie, vyčištění a kontrola připojení. Instalována nová baterie včetně těsnění a příslušenství. Zkontrolována funkčnost teplé a studené vody, těsnost všech spojů. Baterie plně funkční bez úniku.' },
  { cat: 'Instalatér', icon: '🚽', title: 'Oprava WC / splachování',
    text: 'Provedena diagnostika závady splachování WC. Demontáž nádržky, kontrola ventilů a plovákového mechanismu. Výměna poškozeného/opotřebovaného dílu. Zpětná montáž, nastavení hladiny vody, kontrola správného splachování. WC plně funkční.' },
  { cat: 'Instalatér', icon: '💧', title: 'Ucpaný odpad / kanalizace',
    text: 'Provedeno mechanické/chemické čištění ucpaného odpadního potrubí. Lokalizováno místo ucpání, použita spirála/čistící prostředek. Odpad průchodný, provedena zkouška průtoku vody. Doporučena prevence proti opětovnému ucpání.' },
  { cat: 'Instalatér', icon: '🔥', title: 'Oprava ohřevu vody / bojleru',
    text: 'Provedena diagnostika závady ohřevu vody. Kontrola termostatů, topných těles a pojistek. Výměna poškozeného dílu. Ohřev vody obnoven, zkontrolována správná teplota a těsnost. Zařízení plně funkční.' },

  // ELEKTRIKÁŘ
  { cat: 'Elektrikář', icon: '⚡', title: 'Porucha elektrického okruhu',
    text: 'Provedena diagnostika elektrického okruhu, lokalizace závady. Zkontrolován rozvaděč, jističe a proudové chrániče. Nalezena a opravena závada (zkrat/přerušení vodiče/vadná zásuvka). Měření izolačního odporu, kontrola funkčnosti. Okruh plně funkční.' },
  { cat: 'Elektrikář', icon: '💡', title: 'Výměna zásuvky / vypínače',
    text: 'Provedena demontáž poškozené zásuvky/vypínače, kontrola stavu kabeláže. Instalována nová zásuvka/vypínač, zkontrolováno správné zapojení a utažení svorek. Provedeno měření, vše funkční a bezpečné.' },
  { cat: 'Elektrikář', icon: '🔌', title: 'Výpadek proudu / jistič',
    text: 'Provedena diagnostika příčiny výpadku proudu. Kontrola jističů a proudových chráničů v rozvaděči. Identifikováno přetížení/zkrat na okruhu. Závada opravena, jistič znovu zapnut. Doporučena kontrola spotřebičů na daném okruhu.' },

  // ZÁMEČNÍK
  { cat: 'Zámečník', icon: '🔐', title: 'Nouzové otevření dveří',
    text: 'Provedeno nouzové otevření zabouchnutých/zamčených dveří nedestruktivní metodou. Zámek neporušen, dveře funkční. Klientovi předány klíče, zkontrolována správná funkce zamykání a odemykání.' },
  { cat: 'Zámečník', icon: '🗝️', title: 'Výměna zámku / vložky',
    text: 'Provedena demontáž stávajícího cylindrického vložky/zámku. Instalována nová bezpečnostní vložka/zámek. Zkontrolována plynulost chodu, funkčnost zamykání ze všech stran. Klientovi předány nové klíče.' },
  { cat: 'Zámečník', icon: '🚪', title: 'Oprava dveří / kování',
    text: 'Provedena oprava/výměna poškozeného kování na dveřích. Seřízení dveřního křídla, mazání pantu, kontrola dosedání a zavírání. Dveře plně funkční.' },

  // TOPENÁŘ
  { cat: 'Topenář', icon: '🌡️', title: 'Oprava radiátoru / vytápění',
    text: 'Provedena diagnostika závady vytápění. Kontrola radiátorů, termostatických hlavic a rozvodů. Odvzdušnění radiátorů/oprava úniku. Zkontrolována teplota a rovnoměrnost vytápění. Systém plně funkční.' },
  { cat: 'Topenář', icon: '♨️', title: 'Oprava kotle',
    text: 'Provedena diagnostika závady kotle. Kontrola hořáku, výměníku, čerpadla a elektroniky. Nalezena závada, provedena oprava/výměna dílu. Kotel spuštěn, zkontrolovány provozní parametry. Doporučena pravidelná servisní prohlídka.' },

  // SKLENÁŘ
  { cat: 'Sklenář', icon: '🪟', title: 'Výměna rozbitého skla',
    text: 'Provedeno odstranění rozbitého skla, vyčištění rámu. Zaměření a instalace nového skla odpovídajících rozměrů. Zasklení provedeno včetně těsnění. Okno/dveře plně funkční, těsnost zkontrolována.' },
  { cat: 'Sklenář', icon: '🔲', title: 'Oprava okna / seřízení',
    text: 'Provedeno seřízení okenních kování, výměna těsnění. Kontrola funkčnosti otevírání a sklápění. Mazání pohyblivých částí. Okno správně dosedá, těsní a je plně funkční.' },

  // TRUHLÁŘ
  { cat: 'Truhlář', icon: '🪵', title: 'Oprava nábytku / dveří',
    text: 'Provedena oprava poškozeného nábytku/interiérových dveří. Seřízení/výměna pantů, oprava povrchové úpravy. Všechny díly pevně spojeny, funkční a esteticky v pořádku.' },

  // POKRÝVAČ
  { cat: 'Pokrývač', icon: '🏠', title: 'Oprava střechy / zatékání',
    text: 'Provedena prohlídka střešní krytiny, lokalizace místa zatékání. Oprava/výměna poškozených tašek/krytiny, utěsnění problematických míst. Provedena kontrola, zatékání odstraněno. Doporučena komplexní prohlídka střechy.' },

  // PLYNAŘ
  { cat: 'Plynař', icon: '🔥', title: 'Kontrola / oprava plynového vedení',
    text: 'Provedena kontrola plynového vedení a spotřebičů. Detekce úniku plynu, lokalizace a oprava netěsnosti. Provedena tlaková zkouška, měření těsnosti. Plynové vedení bezpečné a těsné.' },

  // DIAGNOSTIKA
  { cat: 'Diagnostika', icon: '🔍', title: 'Diagnostická návštěva',
    text: 'Provedena diagnostická návštěva za účelem zjištění rozsahu a příčiny závady. Závada posouzena, vyhotoven rozpis potřebných prací a materiálu. Technik doporučuje následnou opravu dle přiloženého popisu.' },

  // OBECNÉ
  { cat: 'Obecné', icon: '⚠️', title: 'Havarijní zásah — zabezpečení',
    text: 'Provedeno havarijní zabezpečení místa poruchy. Zamezeno dalšímu poškození (uzavřen přívod vody/plynu/proudu, provizorní oprava). Místo zabezpečeno, doporučena definitivní oprava v nejbližším termínu.' },
  { cat: 'Obecné', icon: '❌', title: 'Oprava nebyla provedena',
    text: 'Po příjezdu na místo bylo zjištěno, že opravu nelze provést z důvodu: [doplnit důvod — nepřítomnost klienta / rozsah nad rámec / chybějící přístup / jiné]. Klient informován o dalším postupu. Diagnostická návštěva uzavřena bez provedení opravy.' },
]

interface WorkTemplatesProps {
  language: Language
  onSelect: (text: string) => void
  currentValue: string
}

export default function WorkTemplates({ language, onSelect, currentValue }: WorkTemplatesProps) {
  const t = (key: string) => getTranslation(language, key as any)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)

  const filtered = useMemo(() => {
    if (!search) return TEMPLATES
    const q = search.toLowerCase()
    return TEMPLATES.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.cat.toLowerCase().includes(q) ||
        t.text.toLowerCase().includes(q)
    )
  }, [search])

  const grouped = useMemo(() => {
    const groups: { [cat: string]: Template[] } = {}
    filtered.forEach((tmpl) => {
      if (!groups[tmpl.cat]) groups[tmpl.cat] = []
      groups[tmpl.cat].push(tmpl)
    })
    return groups
  }, [filtered])

  const handleSelect = (tmpl: Template) => {
    if (currentValue) {
      setPendingTemplate(tmpl)
      return
    }
    onSelect(tmpl.text)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
      >
        📋 {t('templates.trigger')}
      </button>

      {isOpen && (
        <div className="templates-panel open">
          <input
            type="text"
            className="field-input"
            placeholder={t('templates.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: 12 }}
          />

          <div className="templates-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {Object.keys(grouped).length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20, fontSize: 13 }}>
                {t('templates.noResults')}
              </p>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="template-category">{cat}</div>
                {items.map((tmpl, i) => (
                  <div
                    key={i}
                    className="template-item"
                    onClick={() => handleSelect(tmpl)}
                  >
                    <span className="t-icon">{tmpl.icon}</span>
                    <div className="t-body">
                      <div className="t-title">{tmpl.title}</div>
                      <div className="t-preview">{tmpl.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!pendingTemplate}
        message={t('templates.confirmOverwrite')}
        variant="warning"
        confirmLabel={t('templates.overwrite') || 'Přepsat'}
        cancelLabel={t('templates.cancel') || 'Zrušit'}
        onConfirm={() => {
          if (pendingTemplate) {
            onSelect(pendingTemplate.text)
            setIsOpen(false)
            setSearch('')
          }
          setPendingTemplate(null)
        }}
        onCancel={() => setPendingTemplate(null)}
      />
    </div>
  )
}
