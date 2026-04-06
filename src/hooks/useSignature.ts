'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import SignaturePad from 'signature_pad'

interface UseSignatureReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>
  isEmpty: boolean
  clear: () => void
  getSignature: () => string | null
  isReady: boolean
}

export function useSignature(): UseSignatureReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(ratio, ratio)
      }
      // Clear after resize
      if (signaturePadRef.current) {
        signaturePadRef.current.clear()
        setIsEmpty(true)
      }
    }

    resizeCanvas()

    // Initialize SignaturePad
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    })

    signaturePad.addEventListener('endStroke', () => {
      setIsEmpty(signaturePad.isEmpty())
    })

    signaturePadRef.current = signaturePad
    setIsReady(true)

    // Handle window resize
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      signaturePad.off()
    }
  }, [])

  const clear = useCallback(() => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      setIsEmpty(true)
    }
  }, [])

  const getSignature = useCallback((): string | null => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      return null
    }
    return signaturePadRef.current.toDataURL('image/png')
  }, [])

  return {
    canvasRef,
    isEmpty,
    clear,
    getSignature,
    isReady,
  }
}
