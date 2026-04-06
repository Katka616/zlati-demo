'use client'

import { Language, PhotoItem } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface ChecklistProps {
  language: Language
  checklist: boolean[]
  photos: PhotoItem[]
  hasSignature: boolean
  onToggle: (index: number) => void
}

const CHECKLIST_KEYS = [
  'checklist.photo1',
  'checklist.photo2',
  'checklist.photo3',
  'checklist.photo4',
  'checklist.protocolComplete',
  'checklist.clientSignature',
]

export default function Checklist({
  language,
  checklist,
  photos,
  hasSignature,
  onToggle,
}: ChecklistProps) {
  const t = (key: string) => getTranslation(language, key as any)

  // Auto-determine photo check status
  const getAutoStatus = (index: number): { checked: boolean; label: string } => {
    if (index < 4) {
      const hasPhoto = photos.some((p) => p.index === index)
      return {
        checked: hasPhoto,
        label: hasPhoto ? t('checklist.uploaded') : '',
      }
    }
    if (index === 5) {
      return {
        checked: hasSignature,
        label: '',
      }
    }
    return { checked: checklist[index], label: '' }
  }

  return (
    <div className="checklist-container">
      {CHECKLIST_KEYS.map((key, index) => {
        const auto = getAutoStatus(index)
        const isChecked = index < 4 || index === 5 ? auto.checked : checklist[index]
        const isAutomatic = index < 4 || index === 5

        return (
          <div
            key={index}
            className={`check-item${isChecked ? ' checked' : ''}`}
            onClick={() => {
              if (!isAutomatic) onToggle(index)
            }}
            style={{ cursor: isAutomatic ? 'default' : 'pointer' }}
          >
            <span className="check-box">{isChecked ? '✓' : ''}</span>
            <span className="check-label">
              {t(key)}
              {auto.label && (
                <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 8 }}>
                  ✓ {auto.label}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
