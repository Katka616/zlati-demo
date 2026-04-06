'use client'

import { Language, SparePart, MATERIAL_UNITS } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface SparePartsProps {
  language: Language
  spareParts: SparePart[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof SparePart, value: string | number) => void
  isVatPayer?: boolean
}

export function SpareParts({
  language,
  spareParts,
  onAdd,
  onRemove,
  onUpdate,
  isVatPayer,
}: SparePartsProps) {
  const t = (key: string) => getTranslation(language, key as any)

  return (
    <div>
      <div id="materialContainer">
        {spareParts.map((part, index) => (
          <div key={part.id} className="material-item">
            <span className="material-num">{index + 1}</span>
            {spareParts.length > 1 && (
              <button
                type="button"
                className="btn-remove-material"
                onClick={() => onRemove(part.id)}
              >
                ×
              </button>
            )}

            {/* Material name */}
            <div className="field" style={{ marginTop: 8 }}>
              <input
                type="text"
                className="field-input"
                placeholder={t('placeholders.materialName')}
                value={part.name}
                onChange={(e) => onUpdate(part.id, 'name', e.target.value)}
              />
            </div>

            {/* Quantity + Unit + Price */}
            <div className="field-row-3">
              <div className="field">
                <label className="field-label">{t('fields.sparePartQuantity')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="field-input"
                  value={part.quantity}
                  onChange={(e) => onUpdate(part.id, 'quantity', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">{t('fields.sparePartUnit')}</label>
                <select
                  className="field-input"
                  value={part.unit}
                  onChange={(e) => onUpdate(part.id, 'unit', e.target.value)}
                >
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">{t(isVatPayer ? 'fields.sparePartPriceWithoutVat' : 'fields.sparePartPriceWithVat')}</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder={t('placeholders.price')}
                  value={part.price}
                  onChange={(e) => onUpdate(part.id, 'price', e.target.value)}
                />
              </div>
            </div>

            {/* Type + Payer sa určujú automaticky LLM klasifikátorom pri submite */}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-outline"
        onClick={onAdd}
        style={{ width: '100%', marginTop: 12 }}
      >
        {t('material.addMaterial')}
      </button>
    </div>
  )
}
