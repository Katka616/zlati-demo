'use client'

import { useState, useCallback } from 'react'
import {
  CaseData,
  ProtocolFormData,
  ProtocolType,
  SparePart,
  Visit,
  PhotoItem,
  Language,
  createEmptyFormData,
  createEmptyVisit,
  createEmptySparePart,
} from '@/types/protocol'
import { getLanguageFromCountry } from '@/lib/i18n'
import { saveToQueue } from '@/lib/offlineQueue'

interface UseProtocolReturn {
  caseData: CaseData | null
  formData: ProtocolFormData
  language: Language
  loading: boolean
  error: string | null
  isSubmitting: boolean
  isSubmitted: boolean
  savedOffline: boolean
  currentStep: number

  initFromUrlParams: (params: Record<string, string>) => void
  validateToken: (token: string) => Promise<boolean>
  setStep: (step: number) => void
  setProtocolType: (type: ProtocolType) => void
  updateFormField: <K extends keyof ProtocolFormData>(field: K, value: ProtocolFormData[K]) => void

  addVisit: () => void
  removeVisit: (index: number) => void
  updateVisit: (index: number, field: keyof Visit, value: string | number) => void

  addSparePart: () => void
  removeSparePart: (id: string) => void
  updateSparePart: (id: string, field: keyof SparePart, value: string | number) => void

  addPhoto: (photo: PhotoItem) => void
  removePhoto: (index: number) => void

  toggleChecklist: (index: number) => void

  setSignature: (signature: string | null) => void
  setSignerName: (name: string) => void

  submitProtocol: () => Promise<boolean>
  restoreFormData: (data: Partial<ProtocolFormData>) => void
  resetForm: () => void
}

export function useProtocol(): UseProtocolReturn {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [formData, setFormData] = useState<ProtocolFormData>(createEmptyFormData())
  const [language, setLanguage] = useState<Language>('sk')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const initFromUrlParams = useCallback((params: Record<string, string>) => {
    const taskId = params.task_id || ''
    const country = params.country || params.zeme || ''
    const lang = country ? getLanguageFromCountry(country) : 'sk'
    setLanguage(lang)

    const rawKm = params.km ? parseFloat(params.km) : undefined
    const caseInfo: CaseData = {
      taskId,
      caseId: params.ea || '',
      referenceNumber: params.ea || '',
      subject: params.predmet || params.subject || '',
      customerName: params.klient || params.client || '',
      customerPhone: params.tel || params.phone || '',
      customerAddress: params.adresa || params.address || '',
      customerCity: params.mesto || params.city || '',
      country: country || 'SK',
      insurance: params.pojistovna || params.insurance || '',
      category: params.kategorie || params.category || '',
      status: 'pending',
      webhookUrl: params.webhook || '',
      createdAt: new Date().toISOString(),
      distanceKm: rawKm && rawKm > 0 ? rawKm : undefined,
    }
    setCaseData(caseInfo)
    setFormData(createEmptyFormData(caseInfo))
  }, [])

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError(data.error || 'Invalid token')
        setLoading(false)
        return false
      }

      const caseInfo: CaseData = data.caseData
      setCaseData(caseInfo)
      setLanguage(getLanguageFromCountry(caseInfo.country))
      setFormData(createEmptyFormData(caseInfo))
      setLoading(false)
      return true
    } catch {
      setError('Failed to validate token')
      setLoading(false)
      return false
    }
  }, [])

  const setStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const setProtocolType = useCallback((type: ProtocolType) => {
    setFormData((prev) => ({ ...prev, protocolType: type }))
  }, [])

  const updateFormField = useCallback(<K extends keyof ProtocolFormData>(
    field: K,
    value: ProtocolFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // === VISITS ===

  const addVisit = useCallback(() => {
    const kmPerVisit = caseData?.distanceKm ? Math.ceil(caseData.distanceKm * 2) : 0
    setFormData((prev) => {
      const newVisits = [...prev.visits, createEmptyVisit(kmPerVisit)]
      return { ...prev, visits: newVisits, totalVisits: newVisits.length }
    })
  }, [caseData])

  const removeVisit = useCallback((index: number) => {
    setFormData((prev) => {
      if (prev.visits.length <= 1) return prev
      const newVisits = prev.visits.filter((_, i) => i !== index)
      return {
        ...prev,
        visits: newVisits,
        totalVisits: newVisits.length,
        totalHours: newVisits.reduce((sum, v) => sum + v.hours, 0),
        totalKm: newVisits.reduce((sum, v) => sum + v.km, 0),
        totalMaterialHours: newVisits.reduce((sum, v) => sum + v.materialHours, 0),
      }
    })
  }, [])

  const updateVisit = useCallback((index: number, field: keyof Visit, value: string | number) => {
    setFormData((prev) => {
      const newVisits = prev.visits.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
      return {
        ...prev,
        visits: newVisits,
        totalHours: newVisits.reduce((sum, v) => sum + v.hours, 0),
        totalKm: newVisits.reduce((sum, v) => sum + v.km, 0),
        totalMaterialHours: newVisits.reduce((sum, v) => sum + v.materialHours, 0),
      }
    })
  }, [])

  // === SPARE PARTS ===

  const addSparePart = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      spareParts: [...prev.spareParts, createEmptySparePart()],
    }))
  }, [])

  const removeSparePart = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      spareParts: prev.spareParts.filter((part) => part.id !== id),
    }))
  }, [])

  const updateSparePart = useCallback((id: string, field: keyof SparePart, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      spareParts: prev.spareParts.map((part) =>
        part.id === id ? { ...part, [field]: value } : part
      ),
    }))
  }, [])

  // === PHOTOS ===

  const addPhoto = useCallback((photo: PhotoItem) => {
    setFormData((prev) => {
      const existing = prev.photos.findIndex((p) => p.index === photo.index)
      const newPhotos = existing >= 0
        ? prev.photos.map((p, i) => (i === existing ? photo : p))
        : [...prev.photos, photo]
      return { ...prev, photos: newPhotos }
    })
  }, [])

  const removePhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.index !== index),
    }))
  }, [])

  // === CHECKLIST ===

  const toggleChecklist = useCallback((index: number) => {
    setFormData((prev) => {
      const newChecklist = [...prev.checklist]
      newChecklist[index] = !newChecklist[index]
      return { ...prev, checklist: newChecklist }
    })
  }, [])

  // === SIGNATURE ===

  const setSignature = useCallback((signature: string | null) => {
    setFormData((prev) => ({
      ...prev,
      clientSignature: signature || undefined,
    }))
  }, [])

  const setSignerName = useCallback((name: string) => {
    setFormData((prev) => ({ ...prev, clientSignerName: name }))
  }, [])

  // === SUBMISSION (with offline queue fallback) ===

  const submitProtocol = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)
    setSavedOffline(false)

    const payload = {
      ...formData,
      completedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    }

    const webhookUrl = formData.webhookUrl || '/api/submit'

    // If offline, go straight to queue
    if (!navigator.onLine) {
      try {
        await saveToQueue(payload, webhookUrl)
        setSavedOffline(true)
        setIsSubmitted(true)
        setIsSubmitting(false)
        return true
      } catch {
        setError('Uloženie zlyhalo.')
        setIsSubmitting(false)
        return false
      }
    }

    // Online — try network first
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Submit failed')

      setIsSubmitted(true)
      setIsSubmitting(false)
      return true
    } catch {
      // Network failed — save to offline queue
      try {
        await saveToQueue(payload, webhookUrl)
        setSavedOffline(true)
        setIsSubmitted(true)
        setIsSubmitting(false)
        return true
      } catch {
        setError('Odoslanie zlyhalo. Skúste znova.')
        setIsSubmitting(false)
        return false
      }
    }
  }, [formData])

  const restoreFormData = useCallback((data: Partial<ProtocolFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData(createEmptyFormData())
    setCaseData(null)
    setError(null)
    setIsSubmitted(false)
    setSavedOffline(false)
    setCurrentStep(1)
  }, [])

  return {
    caseData,
    formData,
    language,
    loading,
    error,
    isSubmitting,
    isSubmitted,
    savedOffline,
    currentStep,
    initFromUrlParams,
    validateToken,
    setStep,
    setProtocolType,
    updateFormField,
    addVisit,
    removeVisit,
    updateVisit,
    addSparePart,
    removeSparePart,
    updateSparePart,
    addPhoto,
    removePhoto,
    toggleChecklist,
    setSignature,
    setSignerName,
    submitProtocol,
    restoreFormData,
    resetForm,
  }
}
