'use client'

import React from 'react'
import Link from 'next/link'
import { useCallPhone } from '@/hooks/useCallPhone'

interface ChatJobContextProps {
  conversation: {
    jobId: number
    referenceNumber: string
    partnerId?: number | null
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
}

export default function ChatJobContext({ conversation }: ChatJobContextProps) {
  const callPhone = useCallPhone()

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 1.45,
  }

  return (
    <div style={{
      border: '1px solid #E8E2D6',
      borderRadius: 16,
      background: 'var(--bg-card)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Konverzný kontext
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
            {conversation.referenceNumber}
          </div>
        </div>
        {conversation.isVip && (
          <span style={{ borderRadius: 999, border: '1px solid #FCD34D', background: '#FFFBEB', color: '#9A6700', fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
            VIP
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
        <div>
          <div style={labelStyle}>Partner / Poisťovňa</div>
          <div style={valueStyle}>
            {conversation.partnerName && conversation.partnerId ? (
              <a
                href={`/admin/partners/${conversation.partnerId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: '#1F2937', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {conversation.partnerName}
              </a>
            ) : (conversation.partnerName || '—')}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Stav zákazky</div>
          <div style={valueStyle}>{conversation.status} · krok {conversation.crmStep}{conversation.techPhase ? ` · ${conversation.techPhase}` : ''}</div>
        </div>
        <div>
          <div style={labelStyle}>Termín</div>
          <div style={valueStyle}>
            {conversation.scheduledDate || 'Neplánované'}
            {conversation.scheduledTime ? ` · ${conversation.scheduledTime}` : ''}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Klient</div>
          <div style={valueStyle}>
            {conversation.customerName || 'Bez mena'}
            {conversation.customerPhone ? (
              <>
                {' · '}
                <button onClick={() => callPhone(conversation.customerPhone, conversation.customerName ?? undefined)} style={{ color: '#1D4ED8', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                  {conversation.customerPhone}
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Technik</div>
          <div style={valueStyle}>
            {conversation.technicianName && conversation.technicianId ? (
              <a
                href={`/admin/technicians/${conversation.technicianId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: '#1F2937', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {conversation.technicianName}
              </a>
            ) : (conversation.technicianName || 'Nepriradený')}
            {conversation.technicianPhone ? (
              <>
                {' · '}
                <button onClick={() => callPhone(conversation.technicianPhone, conversation.technicianName ?? undefined)} style={{ color: '#1D4ED8', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                  {conversation.technicianPhone}
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Kategória</div>
          <div style={valueStyle}>{conversation.category || '—'}</div>
        </div>
      </div>

      <Link
        href={`/admin/jobs/${conversation.jobId}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #E8E2D6',
          color: '#8B6914',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 12,
          background: '#FFF8E8',
        }}
      >
        Otvoriť detail zákazky
      </Link>
    </div>
  )
}
