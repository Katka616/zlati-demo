'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSSE } from '@/hooks/useSSE'
import { usePathname, useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import AdminLayout from './AdminLayout'
import ChatActionCardList from './ChatActionCardList'
import type { DirectMessageItem } from './ChatActionCardList'
import ChatDetailPanel from './ChatDetailPanel'
import ChatCommandPalette from './ChatCommandPalette'
import WalkthroughProvider from './walkthrough/WalkthroughProvider'
import WalkthroughOverlay from './walkthrough/WalkthroughOverlay'
import WalkthroughTrigger from './walkthrough/WalkthroughTrigger'
import { CHAT_STEPS } from './walkthrough/walkthroughSteps'
import type { AdminChatConversation } from './ChatConversationItem'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  buildAdminChatQueueAiContext,
  buildAdminChatWorkspaceAiContext,
} from '@/lib/adminAi'

function playNotificationBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch { /* AudioContext not available — silent fail */ }
}

type WorkspaceAction = 'activate_operator' | 'return_to_ai' | 'return_to_queue' | 'resolve' | 'reassign' | 'pin' | 'unpin'
type ApprovalAction = 'approve_request' | 'request_revision'
type WorkspaceState = 'AI_ACTIVE' | 'OPERATOR_NEEDED' | 'OPERATOR_ACTIVE' | 'AI_FOLLOWUP' | 'RESOLVED'
type ChannelTarget = 'client' | 'technician'

interface ChatMessage {
  id: number
  job_id: number
  from_role: 'client' | 'operator' | 'tech' | 'system'
  message: string
  channel?: 'dispatch' | 'client' | 'tech-client'
  source?: string
  created_at: string
}

interface ChatHandoffSummary {
  reasonCode: 'human_requested' | 'sensitive_topic' | 'bot_loop' | 'bot_needs_help' | 'vip_attention' | 'sla_risk' | 'approval_needed'
  urgency: 'critical' | 'high' | 'normal'
  waitingOn: 'operator' | 'client' | 'technician' | 'system'
  customerIntent: string
  oneParagraphSummary: string
  whatAiAlreadyDid: string[]
  unresolvedQuestions: string[]
  suggestedReply: string | null
  suggestedReplies: {
    client: string | null
    technician: string | null
  }
  suggestedNextAction: string | null
  lastRelevantMessageAt: string
}

interface WorkspaceDetail {
  workspace: {
    jobId: number
    state: WorkspaceState
    reasonCode: ChatHandoffSummary['reasonCode'] | null
    urgency: ChatHandoffSummary['urgency']
    operatorPriority: 'top' | 'high' | 'medium' | 'low'
    operatorPriorityReason: 'tech_blocked_on_site' | 'client_complaint' | 'approval_waiting' | 'billing_question' | 'general_handoff'
    waitingOn: ChatHandoffSummary['waitingOn']
    assignedOperatorPhone: string | null
    isMine: boolean
    isPinned: boolean
    isVip: boolean
    lastExternalMessageAt: string | null
    lastHandoffAt: string | null
    lastResolvedAt: string | null
  }
  handoffSummary: ChatHandoffSummary | null
  jobContext: {
    jobId: number
    referenceNumber: string
    partnerName: string | null
    isVip: boolean
    category: string | null
    customerName: string | null
    customerPhone: string | null
    technicianId?: number | null
    technicianName: string | null
    technicianPhone: string | null
    status: string
    crmStep: number
    techPhase: string | null
    scheduledDate: string | null
    scheduledTime: string | null
  }
  messages: ChatMessage[]
}

export default function AdminChatEnvironment() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const initialJobId = useMemo(() => {
    const raw = searchParams.get('jobId')
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [searchParams])
  const initialTarget = useMemo(() => {
    const raw = searchParams.get('target')
    return raw === 'client' || raw === 'technician' ? raw : null
  }, [searchParams])
  const initialComposeFocus = useMemo(() => searchParams.get('compose') === '1', [searchParams])

  // ─── State ─────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<AdminChatConversation[]>([])
  const [dmList, setDmList] = useState<DirectMessageItem[]>([])
  const [selectedJobId, setSelectedJobId] = useState<number | null>(initialJobId)
  const [selectedTarget, setSelectedTarget] = useState<ChannelTarget | null>(initialTarget)
  const [selectedDetail, setSelectedDetail] = useState<WorkspaceDetail | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [composeFocusNonce, setComposeFocusNonce] = useState<number>(initialComposeFocus ? Date.now() : 0)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionPending, setActionPending] = useState<WorkspaceAction | ApprovalAction | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [selectedDirectTechId, setSelectedDirectTechId] = useState<number | null>(null)
  const [selectedDirectTechName, setSelectedDirectTechName] = useState<string>('')
  const [selectedDirectTechPhone, setSelectedDirectTechPhone] = useState<string | null>(null)
  const [directMessages, setDirectMessages] = useState<any[]>([])

  // ─── URL sync ──────────────────────────────────────────────────────────────
  const syncSelectedJobId = useCallback((jobId: number | null, startTarget: ChannelTarget | null = null, composeFocus = false) => {
    setSelectedJobId(jobId)
    setSelectedTarget(startTarget)
    setSelectedDirectTechId(null)
    setSelectedDirectTechName('')
    setSelectedDirectTechPhone(null)
    setDirectMessages([])
    if (composeFocus) {
      setComposeFocusNonce(Date.now())
    }

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : searchParams.toString())
    if (jobId) {
      params.set('jobId', String(jobId))
    } else {
      params.delete('jobId')
    }
    if (jobId && startTarget) {
      params.set('target', startTarget)
    } else {
      params.delete('target')
    }
    if (jobId && composeFocus) {
      params.set('compose', '1')
    } else {
      params.delete('compose')
    }

    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', next)
    }
  }, [pathname, searchParams])

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async (keepLoadingState = false): Promise<AdminChatConversation[]> => {
    if (!keepLoadingState) setLoadingList(true)

    try {
      const res = await fetch('/api/admin/chat/conversations?view=all', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Nepodarilo sa načítať chat workspace frontu.')
      }

      const data = await res.json()
      const nextConversations = Array.isArray(data.conversations) ? data.conversations : []
      setConversations(nextConversations)
      return nextConversations
    } catch (error) {
      console.error('[AdminChatEnvironment] fetchConversations failed', error)
      setListError('Nepodarilo sa načítať chat konverzácie.')
      return []
    } finally {
      setLoadingList(false)
    }
  }, [])

  const fetchDirectMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/direct-chat/technicians', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const techs = Array.isArray(data.technicians) ? data.technicians : []
      const items: DirectMessageItem[] = techs
        .filter((t: any) => t.lastMessage)
        .map((t: any) => ({
          technicianId: t.id,
          technicianName: `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Technik #${t.id}`,
          lastMessage: t.lastMessage || '',
          lastMessageAt: t.lastMessageAt || new Date().toISOString(),
          unread: Boolean(t.unreadCount && t.unreadCount > 0),
        }))
      setDmList(items)
    } catch (err) {
      console.warn('[AdminChatEnvironment] DM poll failed:', err)
    }
  }, [])

  const fetchWorkspaceDetail = useCallback(async (jobId: number, keepLoadingState = false) => {
    if (!keepLoadingState) setLoadingDetail(true)
    setDetailError(null)

    try {
      const res = await fetch(`/api/admin/chat/workspaces/${jobId}`, {
        credentials: 'include',
      })

      if (res.status === 404) {
        setSelectedDetail(null)
        setDetailError('Workspace sa nenašiel alebo už nemá chat históriu.')
        return
      }

      if (!res.ok) {
        throw new Error('Nepodarilo sa načítať detail workspace.')
      }

      const detail = await res.json()
      setSelectedDetail(detail)
    } catch (error) {
      console.error('[AdminChatEnvironment] fetchWorkspaceDetail failed', error)
      setDetailError('Detail konverzácie sa nepodarilo načítať.')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // ─── Workspace actions ─────────────────────────────────────────────────────
  const runWorkspacePatch = useCallback(async (
    jobId: number,
    payload: {
      action: WorkspaceAction | ApprovalAction
      content?: string
      note?: string
      operatorPhone?: string
    }
  ) => {
    const res = await fetch(`/api/admin/chat/workspaces/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Workspace action ${payload.action} failed`)
    }

    return res.json()
  }, [])

  const handleWorkspaceAction = useCallback(async (action: WorkspaceAction) => {
    if (!selectedJobId) return

    setActionPending(action)
    try {
      const currentJobId = selectedJobId
      const payload = await runWorkspacePatch(selectedJobId, { action })
      if (payload?.detail) {
        setSelectedDetail(payload.detail)
      } else {
        await fetchWorkspaceDetail(selectedJobId, true)
      }
      const refreshedConversations = await fetchConversations(true)

      if (action === 'resolve') {
        const nextOpen = refreshedConversations.find(c => c.jobId !== currentJobId && c.state !== 'RESOLVED')
          || refreshedConversations.find(c => c.state !== 'RESOLVED')
          || null

        syncSelectedJobId(nextOpen?.jobId ?? null, null)
        if (!nextOpen) {
          setSelectedDetail(null)
          setDetailError(null)
        }
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] handleWorkspaceAction failed', error)
      setDetailError('Akciu sa nepodarilo vykonať. Skúste to znova.')
    } finally {
      setActionPending(null)
    }
  }, [fetchConversations, fetchWorkspaceDetail, runWorkspacePatch, selectedJobId, syncSelectedJobId])

  const handleApprovalAction = useCallback(async (
    action: ApprovalAction,
    payload?: { content?: string; note?: string }
  ) => {
    if (!selectedJobId) return

    setActionPending(action)
    try {
      const response = await runWorkspacePatch(selectedJobId, {
        action,
        content: payload?.content,
        note: payload?.note,
      })
      if (response?.detail) {
        setSelectedDetail(response.detail)
      } else {
        await fetchWorkspaceDetail(selectedJobId, true)
      }
      await fetchConversations(true)
    } catch (error) {
      console.error('[AdminChatEnvironment] handleApprovalAction failed', error)
      setDetailError('Schvaľovanie sa nepodarilo uložiť. Skúste to znova.')
      throw error
    } finally {
      setActionPending(null)
    }
  }, [fetchConversations, fetchWorkspaceDetail, runWorkspacePatch, selectedJobId])

  const handleQuickApprove = useCallback(async (jobId: number) => {
    setActionPending('approve_request')
    try {
      await runWorkspacePatch(jobId, { action: 'approve_request' })
      await fetchConversations(true)
      if (selectedJobId === jobId) {
        await fetchWorkspaceDetail(jobId, true)
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] handleQuickApprove failed', error)
      throw error // re-raise so card shows error state
    } finally {
      setActionPending(null)
    }
  }, [fetchConversations, fetchWorkspaceDetail, runWorkspacePatch, selectedJobId])

  const handleQuickReject = useCallback(async (jobId: number) => {
    setActionPending('request_revision')
    try {
      await runWorkspacePatch(jobId, { action: 'request_revision' })
      await fetchConversations(true)
      if (selectedJobId === jobId) {
        await fetchWorkspaceDetail(jobId, true)
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] handleQuickReject failed', error)
      throw error // re-raise so card shows error state
    } finally {
      setActionPending(null)
    }
  }, [fetchConversations, fetchWorkspaceDetail, runWorkspacePatch, selectedJobId])

  // ─── Direct chat ───────────────────────────────────────────────────────────
  const openDirectChat = useCallback((technicianId: number, techName: string) => {
    setSelectedJobId(null)
    setSelectedDetail(null)
    setDetailError(null)
    setSelectedDirectTechId(technicianId)
    setSelectedDirectTechName(techName)
    setPaletteOpen(false)
    fetch(`/api/admin/direct-chat/${technicianId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setDirectMessages(Array.isArray(data.messages) ? data.messages : [])
        setSelectedDirectTechPhone(data.technician?.phone ?? null)
      })
      .catch(() => setDirectMessages([]))
  }, [])

  const openWorkspaceFromPalette = useCallback((jobId: number) => {
    syncSelectedJobId(jobId)
    setPaletteOpen(false)
  }, [syncSelectedJobId])

  const startConversationFromPalette = useCallback(async (jobId: number, target: ChannelTarget) => {
    setPaletteOpen(false)
    setSelectedDirectTechId(null)
    setSelectedDirectTechName('')
    setSelectedDirectTechPhone(null)
    setDirectMessages([])
    setActionPending('activate_operator')
    try {
      const payload = await runWorkspacePatch(jobId, { action: 'activate_operator' })
      if (payload?.detail) {
        setSelectedDetail(payload.detail)
      }
      syncSelectedJobId(jobId, target, true)
      await fetchConversations(true)
      if (!payload?.detail) {
        await fetchWorkspaceDetail(jobId, true)
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] startConversationFromPalette failed', error)
      setDetailError('Nový chat sa nepodarilo otvoriť. Skúste to znova.')
    } finally {
      setActionPending(null)
    }
  }, [fetchConversations, fetchWorkspaceDetail, runWorkspacePatch, syncSelectedJobId])

  // ─── Message sending ──────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (message: string, target: ChannelTarget) => {
    if (!selectedJobId || !message.trim()) return

    try {
      const res = await fetch(`/api/admin/jobs/${selectedJobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to: target, message: message.trim() }),
      })
      if (res.ok) {
        await fetchWorkspaceDetail(selectedJobId, true)
        await fetchConversations(true)
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] handleSendMessage failed', error)
      setSendError('Správu sa nepodarilo odoslať. Skúste znova.')
    }
  }, [fetchConversations, fetchWorkspaceDetail, selectedJobId])

  const handleSendDirectMessage = useCallback(async (message: string, viaWa?: boolean) => {
    if (!selectedDirectTechId || !message.trim()) return

    try {
      let res: Response
      if (viaWa) {
        // Send via WhatsApp — wa-send already stores to direct_messages + wa_outbox
        res = await fetch('/api/admin/wa-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ technicianId: selectedDirectTechId, message: message.trim() }),
        })
      } else {
        // Send via CRM internal (push/SMS fallback)
        res = await fetch(`/api/admin/direct-chat/${selectedDirectTechId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: message.trim() }),
        })
      }
      if (res.ok) {
        // Refresh messages from DB (both APIs store to direct_messages)
        const dmRes = await fetch(`/api/admin/direct-chat/${selectedDirectTechId}`, { credentials: 'include' })
        if (dmRes.ok) {
          const dmData = await dmRes.json()
          setDirectMessages(Array.isArray(dmData.messages) ? dmData.messages : directMessages)
        }
        fetchDirectMessages()
      }
    } catch (error) {
      console.error('[AdminChatEnvironment] handleSendDirectMessage failed', error)
      setSendError('Správu sa nepodarilo odoslať. Skúste znova.')
    }
  }, [directMessages, fetchDirectMessages, selectedDirectTechId])

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations()
    fetchDirectMessages()
  }, [fetchConversations, fetchDirectMessages])

  useEffect(() => {
    if (selectedJobId) {
      fetchWorkspaceDetail(selectedJobId)
    } else {
      setSelectedDetail(null)
      setDetailError(null)
    }
  }, [fetchWorkspaceDetail, selectedJobId])

  // SSE-driven updates (replaces 3× 10s polling loops)
  // handlersRef in useSSE always reads the latest closures so selectedJobId /
  // selectedDirectTechId values are current without additional deps.
  useSSE({
    endpoint: '/api/sse/admin',
    enabled: true,
    handlers: {
      onChatMessage: (data: unknown) => {
        const p = data as { jobId?: number; technicianId?: number; fromRole?: string }
        fetchConversations(true).catch(() => undefined)
        // Play audio alert for incoming external messages on a different job
        if (p.fromRole !== 'operator' && p.fromRole !== 'system' && p.jobId !== selectedJobId) {
          playNotificationBeep()
        }
        if (p.jobId === selectedJobId && selectedJobId !== null) {
          fetchWorkspaceDetail(selectedJobId, true).catch(() => undefined)
        }
        if (p.jobId === -1 && p.technicianId === selectedDirectTechId && selectedDirectTechId !== null) {
          fetch(`/api/admin/direct-chat/${selectedDirectTechId}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDirectMessages(Array.isArray(d.messages) ? d.messages : []))
            .catch(() => {})
        }
      },
      onJobUpdate: () => {
        fetchConversations(true).catch(() => undefined)
      },
      onReconnect: () => {
        fetchConversations().catch(() => undefined)
        if (selectedJobId) fetchWorkspaceDetail(selectedJobId, true).catch(() => undefined)
        fetchDirectMessages().catch(() => undefined)
      },
    },
  })

  useEffect(() => {
    if (initialJobId && initialJobId !== selectedJobId) {
      setSelectedJobId(initialJobId)
    }
  }, [initialJobId, selectedJobId])

  useEffect(() => {
    if (initialTarget !== selectedTarget) {
      setSelectedTarget(initialTarget)
    }
  }, [initialTarget, selectedTarget])

  useEffect(() => {
    if (initialComposeFocus) {
      setComposeFocusNonce(Date.now())
    }
  }, [initialComposeFocus, initialJobId, initialTarget])

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ─── AI Context ────────────────────────────────────────────────────────────
  const selectedConversation = selectedJobId
    ? conversations.find(c => c.jobId === selectedJobId) ?? null
    : null

  const selectedContext = selectedDetail?.jobContext ?? (selectedConversation ? {
    jobId: selectedConversation.jobId,
    referenceNumber: selectedConversation.referenceNumber,
    partnerName: selectedConversation.partnerName,
    isVip: selectedConversation.isVip,
    category: null,
    customerName: selectedConversation.customerName,
    customerPhone: selectedConversation.customerPhone,
    technicianName: selectedConversation.technicianName,
    technicianPhone: selectedConversation.technicianPhone,
    status: selectedConversation.status,
    crmStep: selectedConversation.crmStep,
    techPhase: selectedConversation.techPhase,
    scheduledDate: selectedConversation.scheduledDate,
    scheduledTime: selectedConversation.scheduledTime,
  } : null)

  const summary = selectedDetail?.handoffSummary
  const workspace = selectedDetail?.workspace ?? null

  const aiContext = selectedJobId && selectedContext
    ? buildAdminChatWorkspaceAiContext({
        jobId: selectedContext.jobId,
        referenceNumber: selectedContext.referenceNumber,
        partnerName: selectedContext.partnerName ?? undefined,
        customerName: selectedContext.customerName ?? undefined,
        technicianName: selectedContext.technicianName ?? undefined,
        status: selectedContext.status,
        crmStep: selectedContext.crmStep,
        techPhase: selectedContext.techPhase,
        workspaceState: workspace?.state ?? selectedConversation?.state,
        urgency: workspace?.urgency ?? selectedConversation?.urgency,
        waitingOn: workspace?.waitingOn ?? selectedConversation?.waitingOn,
        isVip: selectedContext.isVip,
        scheduledDate: selectedContext.scheduledDate ?? undefined,
        scheduledTime: selectedContext.scheduledTime ?? undefined,
        customerIntent: summary?.customerIntent ?? undefined,
        unresolvedQuestionsCount: summary?.unresolvedQuestions.length,
        whatAiAlreadyDidCount: summary?.whatAiAlreadyDid.length,
        hasSuggestedReply: Boolean(summary?.suggestedReplies.client || summary?.suggestedReplies.technician || summary?.suggestedReply),
        messageCount: selectedDetail?.messages.length,
        lastRelevantMessageAt: summary?.lastRelevantMessageAt ?? selectedConversation?.lastRelevantMessageAt ?? undefined,
      })
    : buildAdminChatQueueAiContext({
        viewMode: isMobile ? 'mobile_open' : 'chat_rail',
        totalConversations: conversations.length,
        operatorNeededCount: conversations.filter(c => c.state === 'OPERATOR_NEEDED').length,
        operatorActiveCount: conversations.filter(c => c.state === 'OPERATOR_ACTIVE').length,
        highUrgencyCount: conversations.filter(c => c.urgency === 'high').length,
        criticalUrgencyCount: conversations.filter(c => c.urgency === 'critical').length,
        unreadExternalCount: conversations.filter(c => c.hasUnreadExternal).length,
        mineCount: conversations.filter(c => c.isMine).length,
        selectedReference: selectedConversation?.referenceNumber ?? undefined,
        topWorkspaces: conversations.slice(0, 3).map(c =>
          c.partnerName ? `${c.referenceNumber} · ${c.partnerName}` : c.referenceNumber
        ),
      })

  // ─── Resizable panel ────────────────────────────────────────────────────────
  const [detailWidth, setDetailWidth] = useState(() => {
    if (typeof window === 'undefined') return 440
    return parseInt(localStorage.getItem('chat-detail-width') || '440')
  })
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dragging) return

    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX
      const clamped = Math.max(340, Math.min(newWidth, containerRect.width - 300))
      setDetailWidth(clamped)
    }

    function onMouseUp() {
      setDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      localStorage.setItem('chat-detail-width', String(detailWidth))
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [dragging, detailWidth])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const isDirectMode = selectedDirectTechId !== null
  const hasDetailOpen = selectedJobId !== null || isDirectMode
  const showMobileDetail = isMobile && hasDetailOpen

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Chat Monitor" hideAppHeader aiContext={aiContext}>
      <WalkthroughProvider>
        <WalkthroughOverlay />

        <ChatCommandPalette
          open={paletteOpen}
          conversations={conversations}
          onClose={() => setPaletteOpen(false)}
          onOpenWorkspace={openWorkspaceFromPalette}
          onStartConversation={startConversationFromPalette}
          onStartDirectChat={openDirectChat}
        />

        {(listError || sendError) && (
          <div style={{
            padding: '8px 14px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 101,
          }}>
            {sendError ?? listError}
            <button
              onClick={() => { setSendError(null); setListError(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', fontWeight: 700, fontSize: 16, lineHeight: 1 }}
            >×</button>
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            display: 'flex',
            flex: 1,
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            background: 'var(--g1)',
          }}
        >
          {/* Left panel: Action card list */}
          {(!isMobile || !showMobileDetail) && (
            <div style={{
              flex: 1,
              minWidth: 300,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <ChatActionCardList
                conversations={conversations}
                directMessages={dmList}
                selectedJobId={selectedJobId}
                selectedDirectTechId={selectedDirectTechId}
                onSelectJob={(jobId) => syncSelectedJobId(jobId)}
                onSelectDirect={openDirectChat}
                onQuickApprove={handleQuickApprove}
                onQuickReject={handleQuickReject}
                onOpenPalette={() => setPaletteOpen(true)}
                loading={loadingList}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* Drag handle */}
          {hasDetailOpen && !isMobile && (
            <div
              onMouseDown={() => setDragging(true)}
              style={{
                width: 6,
                cursor: 'col-resize',
                background: dragging ? 'var(--accent)' : 'transparent',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.background = '#d1d5db' }}
              onMouseLeave={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 4,
                height: 32,
                borderRadius: 2,
                background: dragging ? '#fff' : '#d1d5db',
                transition: 'background 0.15s',
              }} />
            </div>
          )}

          {/* Right panel: Detail panel */}
          {hasDetailOpen && (
            <div style={{
              width: isMobile ? '100%' : detailWidth,
              minWidth: isMobile ? undefined : 340,
              flexShrink: 0,
              borderLeft: isMobile ? 'none' : '1px solid #e5e7eb',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
              ...(isMobile ? {
                position: 'fixed' as const,
                inset: 0,
                zIndex: 100,
                width: '100%',
                height: '100%',
              } : {}),
            }}>
              <ChatDetailPanel
                detail={selectedDetail}
                loading={loadingDetail}
                error={detailError}
                directMode={isDirectMode}
                directTechId={selectedDirectTechId}
                directTechName={selectedDirectTechName}
                directTechPhone={selectedDirectTechPhone}
                directMessages={directMessages}
                onClose={() => {
                  syncSelectedJobId(null)
                  setSelectedDirectTechId(null)
                  setSelectedDirectTechName('')
                  setSelectedDirectTechPhone(null)
                  setDirectMessages([])
                }}
                onSendMessage={handleSendMessage}
                onSendDirectMessage={handleSendDirectMessage}
                onWorkspaceAction={handleWorkspaceAction}
                onApprovalAction={handleApprovalAction}
                actionPending={actionPending}
                composeFocusNonce={composeFocusNonce}
              />
            </div>
          )}
        </div>

        <WalkthroughTrigger steps={CHAT_STEPS} />
      </WalkthroughProvider>
    </AdminLayout>
  )
}
