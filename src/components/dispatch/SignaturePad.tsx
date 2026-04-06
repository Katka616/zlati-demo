'use client'

/**
 * SignaturePad — canvas-based signature input.
 *
 * Features:
 * - Touch + mouse drawing on HTML5 canvas
 * - Smooth Bézier curves
 * - Clear / Save buttons
 * - Preview of existing signature
 * - Exports base64 PNG (without prefix) for DB storage
 */

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
    /** Existing signature as base64 PNG (without data: prefix) */
    existingSignature?: string | null
    /** Called when signature is saved */
    onSave: (signatureBase64: string) => void
    /** Called when signature is cleared/deleted */
    onClear?: () => void
    /** Locale */
    lang?: 'sk' | 'cz'
}

export default function SignaturePad({ existingSignature, onSave, onClear, lang = 'sk' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isEmpty, setIsEmpty] = useState(true)
    const [showCanvas, setShowCanvas] = useState(!existingSignature)
    const [saving, setSaving] = useState(false)
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

    const t = lang === 'cz'
        ? { title: 'Podpis', draw: 'Nakreslit podpis', change: 'Změnit podpis', clear: 'Vymazat', save: 'Uložit podpis', saved: 'Podpis uložen', hint: 'Podepište se prstem nebo myší. Podpis bude použit pro automatické podepisování servisních protokolů.' }
        : { title: 'Podpis', draw: 'Nakresliť podpis', change: 'Zmeniť podpis', clear: 'Vymazať', save: 'Uložiť podpis', saved: 'Podpis uložený', hint: 'Podpíšte sa prstom alebo myšou. Podpis bude použitý na automatické podpisovanie servisných protokolov.' }

    // Initialize canvas
    useEffect(() => {
        if (!showCanvas) return
        const canvas = canvasRef.current
        if (!canvas) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 2.5
        ctx.strokeStyle = '#1a1a1a'

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, rect.width, rect.height)
    }, [showCanvas])

    const getPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        let clientX: number, clientY: number

        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0]
            clientX = touch.clientX
            clientY = touch.clientY
        } else {
            clientX = e.clientX
            clientY = e.clientY
        }

        return { x: clientX - rect.left, y: clientY - rect.top }
    }, [])

    const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault()
        const point = getPoint(e)
        if (!point) return
        setIsDrawing(true)
        setIsEmpty(false)
        lastPoint.current = point

        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) {
            ctx.beginPath()
            ctx.moveTo(point.x, point.y)
        }
    }, [getPoint])

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault()
        if (!isDrawing) return
        const point = getPoint(e)
        if (!point || !lastPoint.current) return

        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return

        // Smooth curve using quadratic Bézier
        const midX = (lastPoint.current.x + point.x) / 2
        const midY = (lastPoint.current.y + point.y) / 2
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(midX, midY)

        lastPoint.current = point
    }, [isDrawing, getPoint])

    const endDraw = useCallback(() => {
        setIsDrawing(false)
        lastPoint.current = null
    }, [])

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, rect.width, rect.height)
        setIsEmpty(true)
    }, [])

    const saveSignature = useCallback(async () => {
        const canvas = canvasRef.current
        if (!canvas || isEmpty) return

        setSaving(true)
        try {
            // Export as PNG, strip the data:image/png;base64, prefix
            const dataUrl = canvas.toDataURL('image/png')
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
            await onSave(base64)
            setShowCanvas(false)
        } finally {
            setSaving(false)
        }
    }, [isEmpty, onSave])

    const handleClear = useCallback(async () => {
        setShowCanvas(true)
        if (onClear) {
            await onClear()
        }
    }, [onClear])

    // Existing signature preview mode
    if (!showCanvas && existingSignature) {
        return (
            <div className="profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 className="profile-section-title">✍️ {t.title}</h3>
                </div>
                <div style={{
                    background: '#ffffff',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    padding: 12,
                    textAlign: 'center',
                }}>
                    <img
                        src={existingSignature.startsWith('data:') ? existingSignature : `data:image/png;base64,${existingSignature}`}
                        alt="Podpis"
                        style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}
                    />
                </div>
                <button
                    onClick={() => setShowCanvas(true)}
                    style={{
                        marginTop: 10,
                        width: '100%',
                        padding: '10px',
                        border: '1.5px solid var(--gold)',
                        borderRadius: 10,
                        background: 'transparent',
                        color: 'var(--gold)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    ✏️ {t.change}
                </button>
            </div>
        )
    }

    // Canvas drawing mode
    return (
        <div className="profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="profile-section-title">✍️ {t.title}</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                {t.hint}
            </p>

            {/* Canvas */}
            <div style={{
                position: 'relative',
                border: '2px dashed var(--input-border)',
                borderRadius: 10,
                overflow: 'hidden',
                touchAction: 'none',
            }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height: 160,
                        cursor: 'crosshair',
                        display: 'block',
                    }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {isEmpty && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        color: 'var(--g4)',
                        fontSize: 14,
                    }}>
                        {t.hint}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                    onClick={clearCanvas}
                    disabled={isEmpty}
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 10,
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: isEmpty ? 'not-allowed' : 'pointer',
                        opacity: isEmpty ? 0.5 : 1,
                    }}
                >
                    🗑️ {t.clear}
                </button>
                <button
                    onClick={saveSignature}
                    disabled={isEmpty || saving}
                    style={{
                        flex: 2,
                        padding: '10px',
                        border: 'none',
                        borderRadius: 10,
                        background: isEmpty ? 'var(--btn-secondary-bg)' : 'var(--gold)',
                        color: isEmpty ? 'var(--text-muted)' : 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isEmpty ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? '⏳ Ukladám...' : `💾 ${t.save}`}
                </button>
            </div>

            {/* Cancel — go back to preview if there's an existing signature */}
            {existingSignature && (
                <button
                    onClick={() => setShowCanvas(false)}
                    style={{
                        marginTop: 6,
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        borderRadius: 8,
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        cursor: 'pointer',
                    }}
                >
                    {lang === 'cz' ? 'Zrušit' : 'Zrušiť'}
                </button>
            )}
        </div>
    )
}
