import React, { useEffect, useState } from 'react';
import { PanelRightClose, RefreshCw, User, MapPin, Briefcase, Phone, Mail, Calendar, PhoneCall, MessageSquare, Map, StickyNote, Copy, Zap, Send, X, Check, ChevronRight, ChevronLeft, Clock, History, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { JOB_STATUS_BADGE_CONFIG, type JobStatus, translateCategory } from '@/lib/constants';
import { getNextSteps } from '@/lib/statusEngine';
import { estimateSingleJob } from '@/lib/costEstimates';
import AdminChatPanel from './AdminChatPanel';
import AiFieldsSection from './AiFieldsSection';
import AdminOverrideModal from './AdminOverrideModal';
import VoicebotCallModal from './VoicebotCallModal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import QuickCommentBar from './QuickCommentBar';
import { normalizePhoneForDial } from '@/lib/phone';
import { useCallPhone } from '@/hooks/useCallPhone';
import { ChevronDown } from 'lucide-react';
import LivePricingWidget from '@/components/dispatch/LivePricingWidget'
import EmailThread from './EmailThread'
import EmailComposeDrawer from './EmailComposeDrawer'

/** Collapsible section — accordion on mobile, always open on desktop */
function CollapsibleSection({ title, icon, isMobile, defaultOpen = false, badge, children }: {
    title: string;
    icon?: React.ReactNode;
    isMobile: boolean;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen || !isMobile);

    // On desktop, always open
    if (!isMobile) {
        return (
            <section>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon}{title}{badge}
                </h3>
                {children}
            </section>
        );
    }

    // Mobile: collapsible accordion
    return (
        <section>
            <button
                onClick={() => setOpen(prev => !prev)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                    fontFamily: "'Montserrat', sans-serif",
                }}
            >
                <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon}{title}{badge}
                </h3>
                <ChevronDown size={14} style={{
                    color: '#4B5563',
                    transform: open ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                }} />
            </button>
            <div style={{
                overflow: 'hidden',
                maxHeight: open ? '2000px' : '0',
                opacity: open ? 1 : 0,
                transition: 'max-height 0.3s ease, opacity 0.2s ease',
                marginTop: open ? '12px' : '0',
            }}>
                {children}
            </div>
        </section>
    );
}

interface SidePanelProps {
    jobId: number;
    onClose: () => void;
    onStatusChange: (id: number, status: string) => void;
}

export default function JobSidePanel({ jobId, onClose, onStatusChange }: SidePanelProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quickAction, setQuickAction] = useState<'chat_client' | 'chat_tech' | 'note' | null>(null);
    const [quickText, setQuickText] = useState('');
    const [quickSending, setQuickSending] = useState(false);
    const [quickFeedback, setQuickFeedback] = useState<'success' | 'error' | null>(null);
    const [copiedRef, setCopiedRef] = useState(false);
    const [notes, setNotes] = useState<{ id: number; content: string; author_name?: string; created_at: string; is_pinned?: boolean }[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [stepChanging, setStepChanging] = useState(false);
    const [stepError, setStepError] = useState<string | null>(null);
    const [technician, setTechnician] = useState<{ id: number; first_name: string; last_name: string; phone: string; email?: string | null; status?: string; rating?: number | null; specializations?: string[]; service_rates?: { standard?: { h1: number; h2: number }; special?: { h1: number; h2: number }; kanalizacia?: { h1: number; h2: number } } | null; travel_costs_per_km?: number | null; country?: string } | null>(null);
    const [matchDistanceKm, setMatchDistanceKm] = useState<number | null>(null);
    const [activityLog, setActivityLog] = useState<{ id: number; action: string; changed_by_name?: string | null; changed_by_role?: string | null; changes?: { field: string; old: unknown; new: unknown }[] | null; created_at: string }[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityExpanded, setActivityExpanded] = useState(false);
    const [activityLoaded, setActivityLoaded] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [showVoicebotModal, setShowVoicebotModal] = useState(false);
    const [voicebotInitialRecipient, setVoicebotInitialRecipient] = useState<'customer' | 'technician'>('customer');
    const [composeDrawerOpen, setComposeDrawerOpen] = useState(false);
    const [composeToEmail, setComposeToEmail] = useState<string | undefined>(undefined);
    const [composeReplyId, setComposeReplyId] = useState<number | undefined>(undefined);
    const [composeReplySubject, setComposeReplySubject] = useState<string | undefined>(undefined);
    const [composeReplyThreadId, setComposeReplyThreadId] = useState<string | undefined>(undefined);
    const callPhone = useCallPhone();
    const customerHasPhone = !!normalizePhoneForDial(job?.customer_phone);
    const technicianHasPhone = !!normalizePhoneForDial(technician?.phone);

    const fetchNotes = async () => {
        setNotesLoading(true);
        try {
            const res = await fetch(`/api/jobs/${jobId}/notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes || []);
            }
        } catch { /* ignore */ } finally {
            setNotesLoading(false);
        }
    };

    useEffect(() => {
        if (quickAction === 'note' && jobId) fetchNotes();
    }, [quickAction, jobId]);

    const sendQuickAction = async () => {
        if (!quickText.trim() || quickSending || !job) return;
        setQuickSending(true);
        try {
            let url = '';
            let body: Record<string, unknown> = {};
            if (quickAction === 'note') {
                url = `/api/jobs/${jobId}/notes`;
                body = { content: quickText.trim() };
            } else {
                url = `/api/admin/jobs/${jobId}/chat`;
                const target = quickAction === 'chat_client' ? 'client' : 'technician';
                body = { to: target, message: quickText.trim(), ...(target === 'technician' && technician?.id ? { technicianId: technician.id } : {}) };
            }
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed');
            setQuickFeedback('success');
            setQuickText('');
            if (quickAction === 'note') await fetchNotes();
            setTimeout(() => { setQuickFeedback(null); }, 1800);
        } catch {
            setQuickFeedback('error');
            setTimeout(() => setQuickFeedback(null), 2500);
        } finally {
            setQuickSending(false);
        }
    };

    const copyRef = () => {
        if (!job?.reference_number) return;
        navigator.clipboard.writeText(job.reference_number).then(() => {
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 1800);
        });
    };

    const changeCrmStep = async (targetStep: number, overrideReason?: string) => {
        if (stepChanging) return;
        setStepChanging(true);
        setStepError(null);
        try {
            const payload: Record<string, unknown> = { crmStep: targetStep }
            if (overrideReason) payload.override_reason = overrideReason
            const res = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setStepError(err.message || 'Zmena sa nepodarila');
                return;
            }
            const data = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setJob((prev: any) => ({ ...prev, crm_step: data.transition.to, status: data.transition.dbStatus }));
            onStatusChange(jobId, data.transition.dbStatus);
        } catch {
            setStepError('Chyba pri zmene kroku');
        } finally {
            setStepChanging(false);
        }
    };

    const toggleUrgency = async () => {
        if (!job) return;
        const newUrgency = job.urgency === 'urgent' ? 'normal' : 'urgent';
        try {
            const res = await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urgency: newUrgency }),
            });
            if (res.ok) {
                setJob({ ...job, urgency: newUrgency });
            } else {
                setStepError('Zmena urgentnosti sa nepodarila');
            }
        } catch {
            setStepError('Chyba siete pri zmene urgentnosti');
        }
    };

    const fetchActivityLog = async () => {
        if (activityLoading) return;
        setActivityLoading(true);
        try {
            const res = await fetch(`/api/audit-log?entity_type=job&entity_id=${jobId}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setActivityLog(data.entries || []);
            }
        } catch { /* ignore */ } finally {
            setActivityLoading(false);
            setActivityLoaded(true);
        }
    };

    const toggleActivity = () => {
        const next = !activityExpanded;
        setActivityExpanded(next);
        if (next && !activityLoaded) fetchActivityLog();
    };

    useEffect(() => {
        const fetchJob = async () => {
            setLoading(true);
            setTechnician(null);
            try {
                const res = await fetch(`/api/jobs/${jobId}`);
                if (!res.ok) throw new Error('Failed to fetch job');
                const data = await res.json();
                const jobData = data.job || data;
                setJob(jobData);
                if (jobData.assigned_to) {
                    fetch(`/api/technicians/${jobData.assigned_to}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(d => { if (d?.technician || d) setTechnician(d?.technician || d); })
                        .catch((err) => console.warn('[JobSidePanel] Nepodarilo sa načítať technika:', err));
                    // Fetch match distance for cost estimate
                    fetch(`/api/jobs/${jobData.id}/matching`)
                        .then(r => r.ok ? r.json() : null)
                        .then(d => {
                            const matches = d?.matches || d?.technicians || [];
                            const match = matches.find((m: { technician_id?: number; id?: number }) =>
                                (m.technician_id || m.id) === jobData.assigned_to
                            );
                            if (match?.distance_km != null) setMatchDistanceKm(Number(match.distance_km));
                        })
                        .catch((err) => console.warn('[JobSidePanel] Nepodarilo sa načítať vzdialenosť:', err));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (jobId) fetchJob();
    }, [jobId]);

    if (!jobId) return null;

    return (
        <>
        <div className="side-panel-enter" style={{
            position: 'fixed',
            ...(isMobile
              ? { inset: 0, width: '100%', height: '100dvh', zIndex: 1000 }
              : { top: 0, right: 0, bottom: 0, width: '500px', zIndex: 50, borderLeft: '1px solid #E8E2D6' }
            ),
            background: '#fff',
            boxShadow: isMobile ? 'none' : '-8px 0 40px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Montserrat', sans-serif"
        }}>
            {/* HEADER */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', borderBottom: '1px solid #E8E2D6',
                background: '#F9FAFB', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>
                        Zákazka {job?.reference_number || '...'}
                    </h2>
                    {!loading && job && (
                        <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            backgroundColor: JOB_STATUS_BADGE_CONFIG[job.status as JobStatus]?.bg || '#eee',
                            color: JOB_STATUS_BADGE_CONFIG[job.status as JobStatus]?.color || '#333'
                        }}>
                            {JOB_STATUS_BADGE_CONFIG[job.status as JobStatus]?.label || job.status}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: isMobile ? '10px' : '6px',
                        border: 'none',
                        background: isMobile ? '#F3F4F6' : 'none',
                        cursor: 'pointer',
                        color: '#374151',
                        borderRadius: isMobile ? '12px' : '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s, color 0.2s',
                        minWidth: isMobile ? '44px' : 'auto',
                        minHeight: isMobile ? '44px' : 'auto',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isMobile ? '#F3F4F6' : 'none'; e.currentTarget.style.color = '#374151'; }}
                >
                    {isMobile
                      ? <ChevronLeft style={{ width: 22, height: 22 }} />
                      : <PanelRightClose style={{ width: 20, height: 20 }} />
                    }
                </button>
            </div>

            {/* QUICK ACTIONS BAR */}
            {!loading && job && (() => {
                const btnBase: React.CSSProperties = {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '8px 6px', border: 'none', background: 'none', cursor: 'pointer',
                    borderRadius: '8px', color: '#4B5563', fontSize: '10px', fontWeight: 600,
                    fontFamily: "'Montserrat', sans-serif", minWidth: '52px',
                    transition: 'background 0.15s, color 0.15s',
                };
                const actions = [
                    {
                        key: 'call_customer', label: 'Volať zákazníkovi', icon: <PhoneCall size={16} />, color: '#0369A1',
                        onClick: () => {
                            const phone = normalizePhoneForDial(job.customer_phone);
                            if (phone) callPhone(phone, job.customer_name ?? undefined);
                        },
                        disabled: !customerHasPhone,
                    },
                    {
                        key: 'call_tech', label: 'Volať technikovi', icon: <PhoneCall size={16} />, color: '#D97706',
                        onClick: () => {
                            const phone = normalizePhoneForDial(technician?.phone);
                            if (phone) callPhone(phone, technician ? `${technician.first_name} ${technician.last_name}`.trim() : undefined);
                        },
                        disabled: !technicianHasPhone,
                    },
                    {
                        key: 'voicebot_customer', label: 'AI Volať zákazníkovi', icon: <Bot size={16} />, color: '#7C3AED',
                        onClick: () => { setVoicebotInitialRecipient('customer'); setShowVoicebotModal(true) },
                        disabled: !customerHasPhone,
                    },
                    {
                        key: 'voicebot_tech', label: 'AI Volať technikovi', icon: <Bot size={16} />, color: '#D97706',
                        onClick: () => { setVoicebotInitialRecipient('technician'); setShowVoicebotModal(true) },
                        disabled: !technicianHasPhone,
                    },
                    {
                        key: 'chat_client', label: 'Klientovi', icon: <MessageSquare size={16} />, color: '#7C3AED',
                        onClick: () => setQuickAction(quickAction === 'chat_client' ? null : 'chat_client'),
                        active: quickAction === 'chat_client',
                    },
                    {
                        key: 'chat_tech', label: 'Technikovi', icon: <MessageSquare size={16} />, color: '#D97706',
                        onClick: () => setQuickAction(quickAction === 'chat_tech' ? null : 'chat_tech'),
                        active: quickAction === 'chat_tech',
                        disabled: !job.assigned_to,
                    },
                    {
                        key: 'map', label: 'Mapa', icon: <Map size={16} />, color: '#059669',
                        onClick: () => {
                            const addr = [job.customer_address, job.customer_city].filter(Boolean).join(', ');
                            if (addr) window.open(`https://maps.google.com?q=${encodeURIComponent(addr)}`, '_blank');
                        },
                        disabled: !job.customer_address && !job.customer_city,
                    },
                    {
                        key: 'note', label: 'Poznámka', icon: <StickyNote size={16} />, color: '#0891B2',
                        onClick: () => setQuickAction(quickAction === 'note' ? null : 'note'),
                        active: quickAction === 'note',
                    },
                    {
                        key: 'copy', label: copiedRef ? 'Skopírované!' : 'Ref. číslo', icon: copiedRef ? <Check size={16} /> : <Copy size={16} />, color: copiedRef ? '#15803D' : '#374151',
                        onClick: copyRef,
                    },
                    {
                        key: 'urgency', label: job.urgency === 'urgent' ? 'Zruš urgentné' : 'Urgentné', icon: <Zap size={16} />, color: job.urgency === 'urgent' ? '#DC2626' : '#4B5563',
                        onClick: toggleUrgency,
                        active: job.urgency === 'urgent',
                    },
                    {
                        key: 'chat_view', label: showChat ? 'Skryť chat' : 'Zobraziť chat', icon: <MessageSquare size={16} />, color: '#0891B2',
                        onClick: () => setShowChat(prev => !prev),
                        active: showChat,
                    },
                ];
                return (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #E8E2D6', background: '#F9FAFB', display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                        {actions.map(a => (
                            <button
                                key={a.key}
                                onClick={a.onClick}
                                disabled={a.disabled}
                                title={a.label}
                                style={{
                                    ...btnBase,
                                    opacity: a.disabled ? 0.35 : 1,
                                    background: a.active ? `${a.color}15` : 'none',
                                    color: a.active ? a.color : '#4B5563',
                                }}
                                onMouseEnter={(e) => { if (!a.disabled) { e.currentTarget.style.background = `${a.color}15`; e.currentTarget.style.color = a.color; }}}
                                onMouseLeave={(e) => { e.currentTarget.style.background = a.active ? `${a.color}15` : 'none'; e.currentTarget.style.color = a.active ? a.color : '#4B5563'; }}
                            >
                                {a.icon}
                                <span>{a.label}</span>
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* COMPOSE PANEL */}
            {quickAction && (
                <div style={{ borderBottom: '1px solid #E8E2D6', background: '#FAFAFA', flexShrink: 0 }}>
                    {/* Existujúce poznámky — len pre 'note' akciu */}
                    {quickAction === 'note' && (
                        <div style={{ maxHeight: '220px', overflowY: 'auto', borderBottom: notes.length > 0 ? '1px solid #E8E2D6' : 'none' }}>
                            {notesLoading ? (
                                <div style={{ padding: '12px 16px', fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                    Načítavam poznámky...
                                </div>
                            ) : notes.length === 0 ? (
                                <div style={{ padding: '10px 16px', fontSize: '12px', color: '#4B5563', fontStyle: 'italic' }}>
                                    Žiadne poznámky k tejto zákazke.
                                </div>
                            ) : (
                                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {notes.map((note) => (
                                        <div key={note.id} style={{
                                            background: note.is_pinned ? '#FFFBEB' : '#fff',
                                            border: `1px solid ${note.is_pinned ? '#FDE68A' : '#E5E7EB'}`,
                                            borderRadius: '8px', padding: '8px 12px',
                                        }}>
                                            {note.is_pinned && (
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                                    📌 Pripnuté
                                                </span>
                                            )}
                                            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                                                {note.content}
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#4B5563' }}>
                                                {note.author_name && <span>{note.author_name}</span>}
                                                <span>{new Date(note.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {quickAction === 'chat_client' ? '💬 Správa klientovi' : quickAction === 'chat_tech' ? '💬 Správa technikovi' : '📎 Nová poznámka'}
                    </div>
                    <textarea
                        value={quickText}
                        onChange={(e) => setQuickText(e.target.value)}
                        placeholder={quickAction === 'note' ? 'Napíšte poznámku...' : 'Napíšte správu...'}
                        rows={3}
                        style={{
                            width: '100%', resize: 'none', padding: '8px 10px', border: '1.5px solid #E5E7EB',
                            borderRadius: '8px', fontSize: '13px', fontFamily: "'Montserrat', sans-serif",
                            outline: 'none', boxSizing: 'border-box', color: '#374151', background: '#fff',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#bf953f'}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) sendQuickAction(); if (e.key === 'Escape') { setQuickAction(null); setQuickText(''); }}}
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#4B5563' }}>Ctrl+Enter odoslať · Esc zrušiť</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => { setQuickAction(null); setQuickText(''); }}
                                style={{ padding: '6px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '12px', color: '#374151', fontFamily: "'Montserrat', sans-serif" }}
                            >
                                <X size={12} style={{ display: 'inline', marginRight: 4 }} />Zrušiť
                            </button>
                            <button
                                onClick={sendQuickAction}
                                disabled={quickSending || !quickText.trim()}
                                style={{
                                    padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: quickText.trim() ? 'pointer' : 'default',
                                    background: quickFeedback === 'success' ? '#16A34A' : quickFeedback === 'error' ? '#DC2626' : '#bf953f',
                                    color: '#fff', fontSize: '12px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
                                    opacity: !quickText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '5px',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {quickFeedback === 'success' ? <><Check size={12} />Odoslané!</> : quickFeedback === 'error' ? 'Chyba' : <><Send size={12} />Odoslať</>}
                            </button>
                        </div>
                    </div>
                    </div>{/* end padding wrapper */}
                </div>
            )}

            {/* ADMIN CHAT PANEL */}
            {showChat && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #E8E2D6', flexShrink: 0, maxHeight: '380px', overflowY: 'auto' }}>
                    <AdminChatPanel jobId={jobId} onClose={() => setShowChat(false)} />
                </div>
            )}

            {/* BODY */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff' }}>
                {loading ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <RefreshCw style={{ width: 32, height: 32, color: '#bf953f', marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: '#374151', fontWeight: 600, fontSize: '14px', margin: 0 }}>Načítavam detaily...</p>
                    </div>
                ) : job ? (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* KLIENT & ADRESA */}
                        <CollapsibleSection title="Klient & Adresa" isMobile={isMobile} defaultOpen={true}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <User style={{ width: 18, height: 18, color: '#4B5563', marginTop: '2px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ color: '#1A1A1A', fontWeight: 600, fontSize: '14px' }}>{job.customer_name || 'Nezadané'}</div>
                                        <div style={{ color: '#4B5563', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <Phone style={{ width: 12, height: 12 }} /> {job.customer_phone ? <a href={`tel:${job.customer_phone}`} style={{ color: '#BF953F', textDecoration: 'none', fontWeight: 600 }}>{job.customer_phone}</a> : '-'}
                                        </div>
                                        <div style={{ color: '#4B5563', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                            <Mail style={{ width: 12, height: 12 }} />
                                            {job.customer_email ? (
                                                <span
                                                    onClick={() => { setComposeToEmail(job.customer_email); setComposeDrawerOpen(true); }}
                                                    style={{ color: '#D4A843', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    {job.customer_email}
                                                    <span style={{ background: '#D4A843', color: '#000', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>
                                                        NAPÍSAŤ
                                                    </span>
                                                </span>
                                            ) : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <MapPin style={{ width: 18, height: 18, color: '#4B5563', marginTop: '2px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ color: '#1A1A1A', fontWeight: 600, fontSize: '14px' }}>{job.customer_city || 'Nezadané mesto'}</div>
                                        <div style={{ color: '#4B5563', fontSize: '13px' }}>{job.customer_address || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>

                        <div style={{ height: '1px', background: '#F3F4F6' }} />

                        {/* AKTUÁLNY KROK — status-aware */}
                        {(() => {
                          const step = Number(job.crm_step ?? 0)
                          const cf = (key: string) => {
                            const v = (job.custom_fields as Record<string, unknown>)?.[key]
                            if (v == null || v === '') return null
                            return String(v)
                          }

                          // Pomocná funkcia na zobrazenie riadku
                          const Row = ({ label, value }: { label: string; value: string | null | undefined }) =>
                            value ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                                <span style={{ fontSize: '12px', color: '#4B5563', flexShrink: 0, marginRight: '12px' }}>{label}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A', textAlign: 'right' }}>{value}</span>
                              </div>
                            ) : null

                          // Krok badge
                          const CRM_STEP_LABELS: Record<number, string> = {
                            0: 'Príjem', 1: 'Priradenie', 2: 'Naplánované', 3: 'Na mieste',
                            4: 'Schvaľovanie ceny', 5: 'Ponuka klientovi', 6: 'Dokončené',
                            7: 'Zúčtovanie', 8: 'Cenová kontrola', 9: 'EA odhláška',
                            10: 'Fakturácia', 11: 'Uhradené', 12: 'Uzavreté'
                          }

                          let rows: React.ReactNode = null

                          const fpCustomer = (() => {
                            try {
                              const raw = (job.custom_fields as Record<string, unknown>)?.final_pricing
                              if (!raw) return undefined
                              const fp = typeof raw === 'string' ? JSON.parse(raw) : raw
                              return (fp as Record<string, unknown>)?.customer as Record<string, unknown> | undefined
                            } catch { return undefined }
                          })()

                          if (step <= 1) {
                            // Nový / Priradenie — zobraz popis + urgency
                            rows = (
                              <>
                                <Row label="Priorita" value={job.urgency === 'urgent' ? '🔴 URGENTNÉ' : '⚪ Normálna'} />
                                <Row label="Kategória" value={translateCategory(job.category)} />
                                <Row label="Odhad hodín" value={cf('estimate_hours') ? cf('estimate_hours') + ' h' : null} />
                                <Row label="Odhad km" value={cf('estimate_km_per_visit') ? cf('estimate_km_per_visit') + ' km/návšteva' : null} />
                              </>
                            )
                          } else if (step <= 3) {
                            // Plánovaný / Na mieste
                            rows = (
                              <>
                                <Row label="Naplánovaný dátum" value={job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('sk-SK') : null} />
                                <Row label="Odhad hodín" value={cf('estimate_hours') ? cf('estimate_hours') + ' h' : null} />
                                <Row label="Odhad km" value={cf('estimate_km_per_visit') ? cf('estimate_km_per_visit') + ' km/návšteva' : null} />
                                <Row label="Odhad návštev" value={cf('estimate_visits')} />
                                <Row label="Diagnostika" value={cf('end_diagnostic_at') ? 'Ukončená' : null} />
                              </>
                            )
                          } else if (step <= 5) {
                            // Schvaľovanie ceny / Ponuka klientovi
                            const coverage = cf('coverage')
                            const approvedTotal = cf('approved_total')
                            const clientSurcharge = cf('client_surcharge') || (fpCustomer?.actualSurcharge ? Number(fpCustomer.actualSurcharge) : null)
                            rows = (
                              <>
                                {coverage && (
                                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px' }}>
                                    <span style={{ color: '#C2410C', fontWeight: 600 }}>Krytie poisťovne: </span>
                                    <span style={{ color: '#9A3412', fontWeight: 700 }}>{coverage} Kč</span>
                                  </div>
                                )}
                                <Row label="Odhad hodín" value={cf('estimate_hours') ? cf('estimate_hours') + ' h' : null} />
                                <Row label="Odhad km" value={cf('estimate_km_per_visit') ? cf('estimate_km_per_visit') + ' km/návšteva' : null} />
                                <Row label="Odhad návštev" value={cf('estimate_visits')} />
                                <Row label="Schválená suma" value={approvedTotal ? approvedTotal + ' Kč' : null} />
                                <Row label="Doplatok klienta" value={clientSurcharge ? clientSurcharge + ' Kč' : null} />
                              </>
                            )
                          } else if (step <= 9) {
                            // Dokončené / Kontrola / EA
                            const approvedTotal = cf('approved_total')
                            const clientSurcharge = cf('client_surcharge') || (fpCustomer?.actualSurcharge ? Number(fpCustomer.actualSurcharge) : null)
                            rows = (
                              <>
                                <Row label="Skutočné hodiny" value={cf('calculated_total_hours') ? cf('calculated_total_hours') + ' h' : null} />
                                <Row label="Skutočné km" value={cf('calculated_total_km') ? cf('calculated_total_km') + ' km' : null} />
                                <Row label="Schválená práca" value={cf('approved_work_price') ? cf('approved_work_price') + ' Kč' : null} />
                                <Row label="Schválená doprava" value={cf('approved_travel_price') ? cf('approved_travel_price') + ' Kč' : null} />
                                <Row label="Schválený materiál" value={cf('approved_material_price') ? cf('approved_material_price') + ' Kč' : null} />
                                {approvedTotal && (
                                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 12px', marginTop: '8px', fontSize: '12px' }}>
                                    <span style={{ color: '#15803D', fontWeight: 600 }}>Schválená suma: </span>
                                    <span style={{ color: '#14532D', fontWeight: 700 }}>{approvedTotal} Kč</span>
                                  </div>
                                )}
                                {clientSurcharge && (
                                  <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '6px' }}>
                                    Doplatok klienta: {clientSurcharge} Kč (odčítaný od výdavku ZR)
                                  </div>
                                )}
                                <Row label="EA status" value={job.ea_status ?? null} />
                              </>
                            )
                          } else {
                            // Fakturácia / Platba / Uzavreté (step 10–12)
                            const approvedTotal = cf('approved_total')
                            rows = (
                              <>
                                {approvedTotal && (
                                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px' }}>
                                    <span style={{ color: '#1D4ED8', fontWeight: 600 }}>Suma faktúry: </span>
                                    <span style={{ color: '#1E3A8A', fontWeight: 700 }}>€ {approvedTotal}</span>
                                  </div>
                                )}
                                <Row label="Stav platby" value={String(job.payment_status ?? '-')} />
                                <Row label="EA status" value={job.ea_status ?? null} />
                                <Row label="Doplatok klienta" value={(cf('client_surcharge') || (fpCustomer?.actualSurcharge ? Number(fpCustomer.actualSurcharge) : null)) ? '€ ' + (cf('client_surcharge') || Number(fpCustomer?.actualSurcharge ?? 0)) : null} />
                              </>
                            )
                          }

                          // Filter: step 5 (cenova_ponuka_klientovi) len ak doplatok > 0
                          const clientSurchargeAmount = Number(cf('client_surcharge') ?? fpCustomer?.actualSurcharge ?? 0)
                          const noSurcharge = clientSurchargeAmount <= 0
                          const nextSteps = getNextSteps(step, 'operator')
                            .filter(s => s !== 5 || !noSurcharge)

                          return (
                            <section>
                              {/* Header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                  Krok {step}
                                </h3>
                                <span style={{
                                  fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px',
                                  background: step >= 10 ? '#DCFCE7' : step >= 6 ? '#FEF3C7' : step >= 4 ? '#FFF7ED' : '#EFF6FF',
                                  color: step >= 10 ? '#15803D' : step >= 6 ? '#92400E' : step >= 4 ? '#C2410C' : '#1D4ED8'
                                }}>
                                  {CRM_STEP_LABELS[step] ?? `Krok ${step}`}
                                </span>
                              </div>

                              {/* Progress bar — 13 segments */}
                              <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
                                {Array.from({ length: 13 }, (_, i) => (
                                  <div key={i} style={{
                                    height: '4px', flex: 1, borderRadius: '2px',
                                    background: i < step ? '#bf953f' : i === step ? '#bf953f' : '#E5E7EB',
                                    opacity: i < step ? 0.5 : 1,
                                  }} />
                                ))}
                              </div>

                              {/* Info rows */}
                              <div style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>

                              {/* Forward step buttons */}
                              {nextSteps.length > 0 && (
                                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {nextSteps.map(target => (
                                    <button
                                      key={target}
                                      onClick={() => changeCrmStep(target)}
                                      disabled={stepChanging}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '7px 14px', borderRadius: '8px', cursor: stepChanging ? 'not-allowed' : 'pointer',
                                        border: 'none', background: stepChanging ? '#E5E7EB' : '#bf953f',
                                        fontSize: '12px', fontWeight: 700, color: stepChanging ? '#4B5563' : '#fff',
                                        fontFamily: "'Montserrat', sans-serif",
                                        transition: 'background 0.15s',
                                      }}
                                      onMouseEnter={(e) => { if (!stepChanging) e.currentTarget.style.background = '#aa771c' }}
                                      onMouseLeave={(e) => { if (!stepChanging) e.currentTarget.style.background = '#bf953f' }}
                                    >
                                      {stepChanging ? 'Mením...' : (
                                        <>{CRM_STEP_LABELS[target] ?? `Krok ${target}`}<ChevronRight size={13} /></>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Admin Override — diskrétny odkaz pre spätný chod */}
                              {step > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                  <button
                                    onClick={() => setShowOverrideModal(true)}
                                    style={{
                                      background: 'none', border: 'none', cursor: 'pointer',
                                      fontSize: '11px', color: '#4B5563', fontWeight: 500,
                                      fontFamily: "'Montserrat', sans-serif",
                                      padding: 0, textDecoration: 'underline',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#4B5563'}
                                  >
                                    ⚠ Admin Override — vrátiť krok
                                  </button>
                                </div>
                              )}

                              {/* Admin Override Modal */}
                              {showOverrideModal && (
                                <AdminOverrideModal
                                  currentStep={step}
                                  onConfirm={async (targetStep, reason) => {
                                    setShowOverrideModal(false)
                                    await changeCrmStep(targetStep, reason)
                                  }}
                                  onCancel={() => setShowOverrideModal(false)}
                                />
                              )}

                              {/* Error */}
                              {stepError && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '12px', color: '#DC2626', fontFamily: "'Montserrat', sans-serif" }}>
                                  {stepError}
                                </div>
                              )}
                            </section>
                          )
                        })()}
                        <div style={{ height: '1px', background: '#F3F4F6' }} />

                        {/* TECHNIK */}
                        <CollapsibleSection title="Priradený technik" isMobile={isMobile} defaultOpen={true}>
                            {technician ? (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #bf953f, #aa771c)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 700, fontSize: '14px',
                                        fontFamily: "'Montserrat', sans-serif"
                                    }}>
                                        {technician.first_name?.[0]}{technician.last_name?.[0]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1A1A1A' }}>
                                                {technician.first_name} {technician.last_name}
                                            </span>
                                            {technician.rating != null && (
                                                <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                                                    ★ {Number(technician.rating).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        {technician.phone && technicianHasPhone && (
                                            <button
                                                onClick={() => callPhone(technician.phone, `${technician.first_name ?? ''} ${technician.last_name ?? ''}`.trim() || undefined)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0369A1', fontSize: '13px', textDecoration: 'none', marginBottom: '3px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                            >
                                                <Phone style={{ width: 12, height: 12 }} />
                                                {technician.phone}
                                            </button>
                                        )}
                                        {technician.email && (
                                            <span
                                                onClick={() => { setComposeToEmail(technician.email!); setComposeDrawerOpen(true); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#D4A843', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginBottom: '5px' }}
                                            >
                                                <Mail style={{ width: 12, height: 12 }} />
                                                {technician.email}
                                            </span>
                                        )}
                                        {technician.specializations && technician.specializations.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                                {technician.specializations.slice(0, 4).map((s: string) => (
                                                    <span key={s} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: '#F3F4F6', color: '#374151', fontWeight: 500 }}>
                                                        {s}
                                                    </span>
                                                ))}
                                                {technician.specializations.length > 4 && (
                                                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: '#F3F4F6', color: '#4B5563' }}>
                                                        +{technician.specializations.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <a
                                        href={`/admin/technicians/${technician.id}`}
                                        style={{ fontSize: '11px', color: '#bf953f', fontWeight: 600, textDecoration: 'none', flexShrink: 0, paddingTop: '2px' }}
                                    >
                                        Profil →
                                    </a>
                                </div>
                            ) : job?.assigned_to ? (
                                <div style={{ fontSize: '13px', color: '#4B5563', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                    Načítavam...
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#4B5563', fontStyle: 'italic' }}>
                                    Technik nie je priradený
                                </div>
                            )}
                        </CollapsibleSection>

                        {/* PRIEBEŽNÁ CENA — live pricing pre operátora */}
                        {job && (() => {
                            const lpStep = Number(job.crm_step ?? 0)
                            if (lpStep < 3 || lpStep > 8 || !job.assigned_to) return null
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#F3F4F6' }} />
                                    <CollapsibleSection title="Priebežná cena" icon={<Zap size={13} />} isMobile={isMobile} defaultOpen={true}>
                                        <LivePricingWidget
                                            jobId={jobId}
                                            lang="sk"
                                            apiUrl={`/api/jobs/${jobId}/live-pricing`}
                                        />
                                    </CollapsibleSection>
                                </>
                            )
                        })()}

                        {/* ODHAD NÁKLADOV — zobraz len pre early-stage zákazky */}
                        {job && (() => {
                            const crmStep = Number(job.crm_step ?? 0)
                            const customFields = (job.custom_fields || {}) as Record<string, unknown>
                            const hasEstimate = customFields.estimate_hours != null && customFields.estimate_hours !== ''
                            const hasActual = customFields.calculated_total_hours != null && customFields.calculated_total_hours !== ''

                            // Vždy spočítaj odhad (ak máme technika), zobraz porovnanie ak existuje reálna cena
                            if (!technician) return null
                            const _srKeyPanel = (() => { const cat = job.category || ''; if (['03. Gasman','04. Gas boiler','05. Electric boiler','06. Thermal pumps','07. Solar panels','11. Electronics','12. Airconditioning','14. Keyservice'].includes(cat)) return 'special'; if (['08. Unblocking','09. Unblocking (big)'].includes(cat)) return 'kanalizacia'; return 'standard' })() as 'standard' | 'special' | 'kanalizacia'
                            const _srPanel = technician.service_rates?.[_srKeyPanel]
                            if (!_srPanel) {
                                return (
                                    <>
                                        <div style={{ height: '1px', background: '#F3F4F6' }} />
                                        <CollapsibleSection title="Odhad nákladov" isMobile={isMobile} defaultOpen={false}>
                                            <div style={{
                                                background: '#FFFBEB', border: '1px solid #FCD34D',
                                                borderRadius: '8px', padding: '12px', fontSize: '13px',
                                                display: 'flex', flexDirection: 'column', gap: '8px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 600 }}>
                                                    <span>⚠️</span>
                                                    <span>Technik nemá vyplnené sadzby — odhad nie je možný</span>
                                                </div>
                                                <a
                                                    href={`/admin/technicians/${technician.id}`}
                                                    style={{
                                                        fontSize: '12px', color: '#D97706', fontWeight: 600,
                                                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    }}
                                                >
                                                    Doplniť v profile →
                                                </a>
                                            </div>
                                        </CollapsibleSection>
                                    </>
                                )
                            }

                            const estimate = estimateSingleJob({
                                jobId: job.id,
                                category: job.category || '',
                                technicianId: technician.id,
                                firstHourRate: _srPanel?.h1 ?? null,
                                additionalHourRate: _srPanel?.h2 ?? null,
                                travelCostPerKm: technician.travel_costs_per_km ?? null,
                                distanceKm: matchDistanceKm,
                            })

                            // Reálna cena po diagnostike (ak existuje)
                            const realHours = hasEstimate ? parseFloat(String(customFields.estimate_hours)) : null
                            const realKm = customFields.estimate_km_per_visit ? parseFloat(String(customFields.estimate_km_per_visit)) : null
                            const realVisits = customFields.estimate_visits ? parseFloat(String(customFields.estimate_visits)) : 1

                            let realCost: number | null = null
                            if (realHours != null) {
                                const firstRate = _srPanel?.h1 ?? 0
                                const addRate = _srPanel?.h2 ?? firstRate
                                const laborReal = Math.min(realHours, 1) * firstRate + Math.max(0, realHours - 1) * addRate
                                const travelReal = (realKm ?? 0) * realVisits * (technician.travel_costs_per_km ?? 0)
                                realCost = Math.round(laborReal + travelReal)
                            }

                            // Skutočné hodiny (po dokončení) — ceny z pricing engine (uložené v custom_fields)
                            const actualHours = hasActual ? parseFloat(String(customFields.calculated_total_hours)) : null

                            let actualCost: number | null = null
                            if (actualHours != null && customFields.calculated_work_price != null) {
                                // Použiť ceny z pricing engine (uložené pri odoslaní protokolu)
                                const workPrice = parseFloat(String(customFields.calculated_work_price)) || 0
                                const travelPrice = parseFloat(String(customFields.calculated_travel_price)) || 0
                                const materialTotal = parseFloat(String(customFields.calculated_material_total)) || 0
                                actualCost = Math.round(workPrice + travelPrice + materialTotal)
                            }

                            // Porovnanie: reálna vs odhad
                            const compareValue = actualCost ?? realCost
                            const diff = compareValue != null ? compareValue - estimate.totalCost : null
                            const diffPct = compareValue != null && estimate.totalCost > 0
                                ? Math.round((diff! / estimate.totalCost) * 100) : null

                            const currency = job.customer_country === 'CZ' ? 'CZK'
                                : job.customer_country === 'SK' ? 'EUR'
                                : customFields.currency_customer === 'EUR' ? 'EUR'
                                : 'CZK'
                            const fmtPrice = (v: number) => currency === 'EUR'
                                ? `€\u00a0${v.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${v.toLocaleString('cs-CZ')} CZK`

                            return (
                                <>
                                    <div style={{ height: '1px', background: '#F3F4F6' }} />
                                    <CollapsibleSection title="Odhad nákladov" isMobile={isMobile} defaultOpen={false}>
                                        <div style={{
                                            background: '#F5F3FF', border: '1px solid #DDD6FE',
                                            borderRadius: '8px', padding: '12px', fontSize: '13px',
                                        }}>
                                            {/* Hlavný odhad */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '18px', color: '#7C3AED' }}>
                                                    {fmtPrice(estimate.totalCost)}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '8px',
                                                    background: estimate.confidence === 'high' ? '#D1FAE5' : estimate.confidence === 'medium' ? '#FEF3C7' : '#FEE2E2',
                                                    color: estimate.confidence === 'high' ? '#065F46' : estimate.confidence === 'medium' ? '#92400E' : '#991B1B',
                                                }}>
                                                    {estimate.confidence === 'high' ? 'vysoká istota' : estimate.confidence === 'medium' ? 'stredná istota' : 'nízka istota'}
                                                </span>
                                            </div>

                                            {/* Rozpad */}
                                            <div style={{ display: 'flex', gap: '16px', marginBottom: '6px', color: '#4B5563', fontSize: '12px' }}>
                                                <span>Práca: {fmtPrice(estimate.laborCost)} ({estimate.avgHours}h)</span>
                                                {estimate.travelCost > 0 && (
                                                    <span>Cesta: {fmtPrice(estimate.travelCost)} ({matchDistanceKm ? (matchDistanceKm * 2).toFixed(0) + ' km' : '-'})</span>
                                                )}
                                            </div>

                                            <div style={{ fontSize: '10px', color: '#4B5563', marginBottom: compareValue != null ? '8px' : 0 }}>
                                                Odhad pri sadzbách technika {technician.first_name} {technician.last_name}
                                                {!estimate.hasDistance && ' · bez km (vzdialenosť neznáma)'}
                                            </div>

                                            {/* Porovnanie s reálnou cenou */}
                                            {compareValue != null && diff != null && diffPct != null && (
                                                <div style={{
                                                    marginTop: '4px', paddingTop: '8px',
                                                    borderTop: '1px solid #DDD6FE',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px' }}>
                                                        <span style={{ color: '#4B5563' }}>
                                                            {actualCost != null ? 'Skutočné náklady:' : 'Po diagnostike:'}
                                                        </span>
                                                        <span style={{ fontWeight: 700, color: '#1A1A1A' }}>
                                                            {fmtPrice(compareValue)}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', marginTop: '3px' }}>
                                                        <span style={{ color: '#4B5563' }}>Rozdiel od odhadu:</span>
                                                        <span style={{
                                                            fontWeight: 700,
                                                            color: diff > 0 ? '#DC2626' : diff < 0 ? '#059669' : '#4B5563',
                                                        }}>
                                                            {diff > 0 ? '+' : ''}{fmtPrice(diff)} ({diff > 0 ? '+' : ''}{diffPct}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleSection>
                                </>
                            )
                        })()}

                        <div style={{ height: '1px', background: '#F3F4F6' }} />

                        {/* DETAIL PRÁCE */}
                        <CollapsibleSection title="Detail práce" isMobile={isMobile} defaultOpen={false}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '12px', border: '1px solid #F3F4F6' }}>
                                    <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Briefcase style={{ width: 12, height: 12 }} /> Kategória
                                    </div>
                                    <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '14px' }}>{translateCategory(job.category)}</div>
                                </div>
                                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '12px', border: '1px solid #F3F4F6' }}>
                                    <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar style={{ width: 12, height: 12 }} /> Naplánované
                                    </div>
                                    <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '14px' }}>
                                        {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('sk-SK') : '-'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '6px' }}>Popis závady (od klienta/partnera)</div>
                                <div style={{
                                    fontSize: '13px', color: '#374151', lineHeight: '1.5',
                                    background: 'rgba(251, 191, 36, 0.05)', padding: '12px', borderRadius: '8px',
                                    border: '1px solid rgba(251, 191, 36, 0.15)'
                                }}>
                                    {job.job_description || <span style={{ fontStyle: 'italic', color: '#4B5563' }}>Bez popisu</span>}
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* CUSTOM POLIA — only user-facing fields with readable labels */}
                        {job.custom_fields && (() => {
                            const cf = job.custom_fields as Record<string, unknown>
                            const invData = (cf.invoice_data as Record<string, unknown>) || {}
                            // invoice_number: čítaj z invoice_data.invoiceNumber s fallbackom na flat kľúč
                            const resolvedInvoiceNumber = (invData.invoiceNumber as string | undefined) ?? (cf.invoice_number as string | undefined)
                            // Doplnkový cf objekt s rozlíšeným číslom faktúry pre DISPLAY_FIELDS
                            const cfDisplay: Record<string, unknown> = { ...cf, _resolved_invoice_number: resolvedInvoiceNumber }
                            // Define which custom fields are worth displaying + their labels
                            const DISPLAY_FIELDS: { key: string; label: string; format?: (v: unknown) => string; valueStyle?: React.CSSProperties; badge?: boolean }[] = [
                                { key: 'client_type', label: 'Typ klienta' },
                                { key: 'diagnostic_only', label: 'Len diagnostika', format: v => v ? 'Áno' : 'Nie' },
                                { key: 'cancel_reason', label: 'Dôvod zrušenia' },
                                { key: 'cancel_note', label: 'Poznámka k zrušeniu', valueStyle: { fontStyle: 'italic' } },
                                { key: 'cancelled_by', label: 'Zrušil', badge: true },
                                { key: 'cancel_source', label: 'Zdroj zrušenia', badge: true },
                                { key: 'hold_reason', label: 'Dôvod pozastavenia' },
                                { key: 'rating', label: 'Hodnotenie klienta', format: v => `${v}/5` },
                                { key: 'client_surcharge', label: 'Doplatok klienta', format: v => `${v} Kč` },
                                { key: 'estimate_amount', label: 'Odhad ceny', format: v => `${v} Kč` },
                                { key: 'estimate_hours', label: 'Odhadované hodiny', format: v => `${v} h` },
                                { key: 'estimate_visits', label: 'Počet návštev' },
                                { key: 'estimate_km_per_visit', label: 'Km/návšteva', format: v => `${v} km` },
                                { key: 'coverage_limit', label: 'Limit krytia', format: v => `${v} Kč` },
                                { key: 'ea_claim_number', label: 'EA číslo škody' },
                                { key: '_resolved_invoice_number', label: 'Číslo faktúry' },
                            ]
                            const visibleFields = DISPLAY_FIELDS.filter(f => {
                                const v = cfDisplay[f.key]
                                return v !== undefined && v !== null && v !== '' && v !== false && v !== 0
                            })
                            if (visibleFields.length === 0) return null
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#F3F4F6' }} />
                                    <CollapsibleSection title="Doplnkové informácie" isMobile={isMobile} defaultOpen={false}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {visibleFields.map(f => {
                                                const raw = cfDisplay[f.key]
                                                const display = f.format ? f.format(raw) : String(raw)
                                                return (
                                                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '11px', color: '#4B5563' }}>{f.label}</span>
                                                        {f.badge ? (
                                                            <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: '11px', fontWeight: 500, color: '#6B7280', background: '#F3F4F6', borderRadius: 6, padding: '2px 8px', marginTop: 2 }}>{display}</span>
                                                        ) : (
                                                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A', ...(f.valueStyle || {}) }}>{display}</span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CollapsibleSection>
                                </>
                            )
                        })()}

                        {/* HISTÓRIA ZMIEN */}
                        <div style={{ height: '1px', background: '#F3F4F6' }} />
                        <section>
                            <button
                                onClick={toggleActivity}
                                style={{
                                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                                    marginBottom: activityExpanded ? '14px' : 0,
                                    fontFamily: "'Montserrat', sans-serif",
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={13} style={{ color: '#4B5563' }} />
                                    <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        História zmien
                                    </h3>
                                    {activityLoaded && activityLog.length > 0 && (
                                        <span style={{ fontSize: '10px', background: '#F3F4F6', color: '#374151', padding: '1px 6px', borderRadius: '999px', fontWeight: 600 }}>
                                            {activityLog.length}
                                        </span>
                                    )}
                                </div>
                                <ChevronRight size={14} style={{
                                    color: '#4B5563',
                                    transform: activityExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.2s',
                                }} />
                            </button>

                            {activityExpanded && (
                                activityLoading ? (
                                    <div style={{ padding: '8px 0', fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                        Načítavam históriu...
                                    </div>
                                ) : activityLog.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#4B5563', fontStyle: 'italic', padding: '4px 0 8px' }}>
                                        Žiadna história zmien.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {activityLog.map((entry, idx) => {
                                            const roleColor = entry.changed_by_role === 'operator' ? '#0369A1'
                                                : entry.changed_by_role === 'technician' ? '#D97706'
                                                : '#4B5563';
                                            const isLast = idx === activityLog.length - 1;
                                            return (
                                                <div key={entry.id} style={{
                                                    display: 'flex', gap: '10px',
                                                    paddingBottom: isLast ? 0 : '10px',
                                                    marginBottom: isLast ? 0 : '10px',
                                                    borderBottom: isLast ? 'none' : '1px dashed #F3F4F6',
                                                }}>
                                                    {/* Timeline dot */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px', flexShrink: 0 }}>
                                                        <div style={{
                                                            width: '8px', height: '8px', borderRadius: '50%',
                                                            background: roleColor,
                                                            boxShadow: `0 0 0 2px ${roleColor}30`,
                                                        }} />
                                                    </div>
                                                    {/* Content */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                                            {entry.action}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                            {entry.changed_by_name && (
                                                                <span style={{ fontSize: '11px', color: roleColor, fontWeight: 600 }}>{entry.changed_by_name}</span>
                                                            )}
                                                            {entry.changed_by_name && <span style={{ fontSize: '11px', color: '#D1D5DB' }}>·</span>}
                                                            <Clock size={10} style={{ color: '#4B5563' }} />
                                                            <span style={{ fontSize: '11px', color: '#4B5563' }}>
                                                                {new Date(entry.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {entry.changes && entry.changes.length > 0 && (
                                                            <div style={{ marginTop: '5px', fontSize: '11px', color: '#374151', background: '#F9FAFB', borderRadius: '6px', padding: '5px 8px', lineHeight: '1.6' }}>
                                                                {entry.changes.slice(0, 3).map((c, ci) => (
                                                                    <div key={ci}>
                                                                        <span style={{ fontWeight: 600 }}>{c.field}</span>
                                                                        {': '}
                                                                        <span style={{ color: '#4B5563' }}>{String(c.old ?? '—')}</span>
                                                                        {' → '}
                                                                        <span style={{ color: '#374151' }}>{String(c.new ?? '—')}</span>
                                                                    </div>
                                                                ))}
                                                                {entry.changes.length > 3 && (
                                                                    <div style={{ color: '#4B5563', marginTop: '2px' }}>+{entry.changes.length - 3} ďalšie zmeny</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </section>

                        <AiFieldsSection jobId={jobId} />

                        {/* EMAILY */}
                        <div style={{ height: '1px', background: '#F3F4F6' }} />
                        <CollapsibleSection
                            title={`Emaily`}
                            icon={<span style={{ fontSize: 13 }}>📧</span>}
                            isMobile={isMobile}
                            defaultOpen={false}
                        >
                            <EmailThread
                                jobId={jobId}
                                jobRef={job.reference_number || String(jobId)}
                                customerName={job.customer_name}
                                customerCountry={job.customer_country}
                                onComposeClick={(toEmail) => {
                                    setComposeReplyId(undefined);
                                    setComposeReplySubject(undefined);
                                    setComposeReplyThreadId(undefined);
                                    setComposeToEmail(toEmail || job.customer_email || undefined);
                                    setComposeDrawerOpen(true);
                                }}
                                onReplyClick={(emailId, subject, threadId, toEmail) => {
                                    setComposeReplyId(emailId);
                                    setComposeReplySubject(subject);
                                    setComposeReplyThreadId(threadId);
                                    setComposeToEmail(toEmail);
                                    setComposeDrawerOpen(true);
                                }}
                            />
                        </CollapsibleSection>

                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                        <p style={{ color: '#DC2626', fontWeight: 600, margin: 0 }}>Chyba pri načítaní zákazky.</p>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div style={{
                padding: '16px', borderTop: '1px solid #E8E2D6',
                background: '#F9FAFB', display: 'flex', gap: '12px', flexShrink: 0
            }}>
                <button
                    onClick={() => router.push(`/admin/jobs/${jobId}`)}
                    style={{
                        flex: 1, background: '#bf953f', color: '#fff',
                        padding: '10px 0', borderRadius: '8px',
                        border: 'none', fontWeight: 600, fontSize: '14px',
                        cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#aa771c'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#bf953f'}
                >
                    Otvoriť plný detail
                </button>
            </div>

            {/* MOBILE QUICK COMMENT BAR */}
            {isMobile && <QuickCommentBar jobId={jobId} />}

            {/* EMAIL COMPOSE DRAWER */}
            <EmailComposeDrawer
                isOpen={composeDrawerOpen}
                onClose={() => {
                    setComposeDrawerOpen(false);
                    setComposeToEmail(undefined);
                    setComposeReplyId(undefined);
                    setComposeReplySubject(undefined);
                    setComposeReplyThreadId(undefined);
                }}
                toEmail={composeToEmail}
                jobId={jobId}
                jobRef={job?.reference_number || undefined}
                customerName={job?.customer_name || undefined}
                customerCountry={job?.customer_country || undefined}
                replyToEmailId={composeReplyId}
                replySubject={composeReplySubject}
                replyThreadId={composeReplyThreadId}
            />
        </div>

        {/* VOICEBOT CALL MODAL */}
        {showVoicebotModal && job && (
            <VoicebotCallModal
                jobId={jobId}
                customerName={job.customer_name ?? null}
                customerPhone={job.customer_phone ?? null}
                technicianName={technician ? `${technician.first_name} ${technician.last_name}` : null}
                technicianPhone={technician?.phone ?? null}
                initialRecipient={voicebotInitialRecipient}
                onClose={() => setShowVoicebotModal(false)}
                onQueued={() => setShowVoicebotModal(false)}
            />
        )}
        </>
    );
}
