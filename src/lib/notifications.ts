/**
 * Notifications — sound + vibration for new dispatch jobs.
 *
 * Uses Web Audio API for a short notification tone.
 * Uses Vibration API for haptic feedback.
 * Both degrade gracefully on unsupported devices.
 */

let audioContext: AudioContext | null = null

/**
 * Play a short notification sound for new job alert.
 * Uses Web Audio API — no external audio files needed.
 */
export function playNewJobSound(): void {
  try {
    if (typeof window === 'undefined') return

    // Lazy-init AudioContext (requires user gesture first time)
    if (!audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      audioContext = new AudioCtx()
    }

    // Resume if suspended (auto-play policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const ctx = audioContext
    const now = ctx.currentTime

    // Create a pleasant two-tone notification
    // First tone: 880Hz (A5) for 150ms
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 880
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Second tone: 1100Hz (C#6) for 200ms, starts after first
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 1100
    gain2.gain.setValueAtTime(0.3, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.35)
  } catch {
    // Silent fail — sound is nice-to-have, not critical
  }
}

/**
 * Vibrate the device for a new job notification.
 * Pattern: vibrate 200ms, pause 100ms, vibrate 200ms.
 */
export function vibrateDevice(): void {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate([200, 100, 200])
  } catch {
    // Silent fail
  }
}

/**
 * Combined notification: sound + vibration.
 * Call this when a new job appears in the available jobs list.
 */
export function notifyNewJob(): void {
  playNewJobSound()
  vibrateDevice()
}

/**
 * Short vibration for status updates or confirmations.
 */
export function vibrateConfirm(): void {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    navigator.vibrate(100)
  } catch {
    // Silent fail
  }
}
