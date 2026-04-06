'use client'

import { useState, useRef } from 'react'
import { Language, PhotoItem, PhotoCategory } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface PhotoUploadProps {
  language: Language
  photos: PhotoItem[]
  onPhotoAdd: (photo: PhotoItem) => void
  onPhotoRemove: (index: number) => void
}

const MAX_TOTAL = 10
const MAX_PER_CATEGORY = 5
const TECH_INDEX_BASE = 100

const CLIENT_SLOTS = [
  { index: 0, labelKey: 'photos.before' },
  { index: 1, labelKey: 'photos.during' },
  { index: 2, labelKey: 'photos.after' },
]

async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (maxWidth / w) * h
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoUpload({
  language,
  photos,
  onPhotoAdd,
  onPhotoRemove,
}: PhotoUploadProps) {
  const t = (key: string) => getTranslation(language, key as never)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [compressError, setCompressError] = useState<string | null>(null)
  const [extraClientSlots, setExtraClientSlots] = useState<number[]>([])
  const [techSlots, setTechSlots] = useState<number[]>([])
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  const clientPhotos = photos.filter(p => p.category === 'client' || (!p.category && p.index < TECH_INDEX_BASE))
  const techPhotos = photos.filter(p => p.category === 'technician')
  const totalPhotos = photos.length
  const canAddMore = totalPhotos < MAX_TOTAL

  const getPhoto = (index: number) => photos.find((p) => p.index === index)

  const handleFileChange = async (slotIndex: number, file: File | undefined, category: PhotoCategory) => {
    if (!file) return
    setProcessing(true)
    setCompressError(null)
    try {
      const compressed = await compressImage(file)
      const label = slotIndex < CLIENT_SLOTS.length
        ? t(CLIENT_SLOTS[slotIndex].labelKey)
        : category === 'client'
          ? `Foto klient ${slotIndex + 1}`
          : `Foto technik ${slotIndex - TECH_INDEX_BASE + 1}`
      onPhotoAdd({ index: slotIndex, data: compressed, label, category })
    } catch {
      console.error('[PhotoUpload] compressImage failed')
      setCompressError('Nepodarilo sa spracovať fotku. Skús iný súbor.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSlotClick = (index: number) => {
    inputRefs.current[index]?.click()
  }

  const addExtraClientSlot = () => {
    if (clientPhotos.length >= MAX_PER_CATEGORY || !canAddMore) return
    const nextIdx = CLIENT_SLOTS.length + extraClientSlots.length
    setExtraClientSlots(prev => [...prev, nextIdx])
  }

  const addTechSlot = () => {
    if (techPhotos.length >= MAX_PER_CATEGORY || !canAddMore) return
    const nextIdx = TECH_INDEX_BASE + techSlots.length
    setTechSlots(prev => [...prev, nextIdx])
  }

  const allClientSlots = [
    ...CLIENT_SLOTS,
    ...extraClientSlots.map(idx => ({ index: idx, labelKey: `Foto klient ${idx + 1}` })),
  ]

  const allTechSlots = techSlots.map(idx => ({
    index: idx,
    labelKey: `Foto technik ${idx - TECH_INDEX_BASE + 1}`,
  }))

  const renderSlot = (slot: { index: number; labelKey: string }, category: PhotoCategory) => {
    const photo = getPhoto(slot.index)
    const isPreset = slot.index < CLIENT_SLOTS.length
    const label = isPreset ? t(slot.labelKey) : slot.labelKey

    return (
      <div
        key={slot.index}
        className={`photo-slot${photo ? ' has-photo' : ''}`}
        onClick={() => !photo && canAddMore && handleSlotClick(slot.index)}
        style={{ opacity: !photo && !canAddMore ? 0.4 : 1 }}
      >
        {photo ? (
          <>
            <img
              src={photo.data}
              alt={label}
              onClick={(e) => {
                e.stopPropagation()
                setLightboxSrc(photo.data)
              }}
            />
            <span className="photo-check">✓</span>
            <button
              type="button"
              className="photo-remove"
              onClick={(e) => {
                e.stopPropagation()
                onPhotoRemove(slot.index)
              }}
            >
              ×
            </button>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="photo-label">{label}</span>
          </>
        )}
        <input
          ref={(el) => { inputRefs.current[slot.index] = el }}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(slot.index, e.target.files?.[0], category)}
        />
      </div>
    )
  }

  return (
    <div>
      {/* ── Client photos ── */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
          {t('photos.clientSection')}
        </h4>
        <p style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 12 }}>
          {t('photos.clientDesc')}
        </p>

        <div className="photo-grid">
          {allClientSlots.map(slot => renderSlot(slot, 'client'))}
        </div>

        {clientPhotos.length < MAX_PER_CATEGORY && canAddMore && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={addExtraClientSlot}
            style={{ width: '100%', marginTop: 10 }}
          >
            {t('photos.addClientPhoto')}
          </button>
        )}

        <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 6, fontWeight: 500 }}>
          {t('photos.counter')}: {clientPhotos.length} / {MAX_PER_CATEGORY}
        </div>
      </div>

      {/* ── Technician photos ── */}
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
          {t('photos.techSection')}
        </h4>
        <p style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 12 }}>
          {t('photos.techDesc')}
        </p>

        {allTechSlots.length > 0 && (
          <div className="photo-grid">
            {allTechSlots.map(slot => renderSlot(slot, 'technician'))}
          </div>
        )}

        {techPhotos.length < MAX_PER_CATEGORY && canAddMore && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={addTechSlot}
            style={{ width: '100%', marginTop: 10 }}
          >
            {t('photos.addTechPhoto')}
          </button>
        )}

        <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 6, fontWeight: 500 }}>
          {t('photos.counter')}: {techPhotos.length} / {MAX_PER_CATEGORY}
        </div>
      </div>

      {/* ── Total counter ── */}
      <div style={{
        textAlign: 'center',
        padding: '10px 0',
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--dark)',
      }}>
        {t('photos.totalCounter')}: {totalPhotos} / {MAX_TOTAL}
        {!canAddMore && (
          <span style={{ color: 'var(--danger)', marginLeft: 8, fontSize: 12 }}>
            {t('photos.limitReached')}
          </span>
        )}
      </div>

      {/* Processing indicator */}
      {processing && (
        <div style={{ textAlign: 'center', padding: 12, color: 'var(--g4)', fontSize: 13 }}>
          {t('photos.processing')}
        </div>
      )}

      {/* Compress error */}
      {compressError && (
        <div style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--danger)', fontSize: 13 }}>
          {compressError}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="lightbox active" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Preview" />
        </div>
      )}
    </div>
  )
}
