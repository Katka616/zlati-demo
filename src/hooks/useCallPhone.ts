'use client'

/**
 * useCallPhone — univerzálny hook pre volania v admin rozhraní.
 *
 * Ak je SIP UA zaregistrovaný → volá cez PBX (zobrazí confirm dialog).
 * Ak SIP nie je ready         → toast cez SipProvider (desktop nemá zmysel otvárať telefón).
 *
 * Použitie:
 *   const callPhone = useCallPhone()
 *   callPhone('+421901234567', 'Ján Novák')
 */

import { useCallback } from 'react'
import { useSip } from '@/components/admin/SipProvider'
import { normalizePhoneForDial } from '@/lib/phone'

export function useCallPhone() {
  const { call, callState } = useSip()

  return useCallback((rawPhone: string | null | undefined, displayName?: string) => {
    const phone = normalizePhoneForDial(rawPhone)
    if (!phone) return

    if (callState === 'calling' || callState === 'connected' || callState === 'ringing') {
      return // hovor prebieha
    }

    // Vždy použij SIP dialóg (confirm dialog ukáže stav registrácie ak nie je ready)
    // Fallback na tel: len ak SIP vôbec nie je nakonfigurovaný (callState === 'idle' bez UA)
    call(phone, displayName)
  }, [call, callState])
}
