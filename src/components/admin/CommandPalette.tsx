'use client'

/**
 * CommandPalette — Global search overlay (Ctrl+K / Cmd+K).
 * Searches jobs and technicians, allows quick navigation.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface SearchJob {
  id: number
  reference_number: string
  customer_name: string | null
  customer_city: string | null
  status: string
  crm_step: number
  priority_flag: string | null
  category: string | null
}

interface SearchTechnician {
  id: number
  first_name: string
  last_name: string
  phone: string
  status: string
  specializations: string[] | null
}

interface SearchResults {
  jobs: SearchJob[]
  technicians: SearchTechnician[]
}

export default function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ jobs: [], technicians: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    if (pathname?.startsWith('/admin/chat')) {
      setOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (pathname?.startsWith('/admin/chat')) {
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pathname])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults({ jobs: [], technicians: [] })
      setSelectedIdx(0)
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ jobs: [], technicians: [] })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setSelectedIdx(0)
      }
    } catch (err) {
      console.warn('[CommandPalette] Nepodarilo sa načítať výsledky vyhľadávania:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 250)
  }

  // Flatten results for keyboard navigation
  const allItems: { type: 'job' | 'technician'; data: SearchJob | SearchTechnician }[] = [
    ...results.jobs.map(j => ({ type: 'job' as const, data: j })),
    ...results.technicians.map(t => ({ type: 'technician' as const, data: t })),
  ]

  const handleSelect = (item: typeof allItems[0]) => {
    setOpen(false)
    if (item.type === 'job') {
      const job = item.data as SearchJob
      router.push(`/admin/jobs?id=${job.id}`)
    } else {
      const tech = item.data as SearchTechnician
      router.push(`/admin/technicians/${tech.id}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allItems[selectedIdx]) {
      e.preventDefault()
      handleSelect(allItems[selectedIdx])
    }
  }

  if (!open) return null

  const CRM_STEP_SHORT: Record<number, string> = {
    0: 'Príjem', 1: 'Dispatching', 2: 'Naplánované', 3: 'Na mieste',
    4: 'Schvaľovanie', 5: 'Ponuka', 6: 'Dokončené', 7: 'Zúčtovanie',
    8: 'Cen. kontrola', 9: 'EA odhláška', 10: 'Fakturácia', 11: 'Uhradené', 12: 'Uzavreté',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(520px, 92vw)',
        background: 'var(--w, #fff)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        zIndex: 9999,
        overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--g8)',
        }}>
          <span style={{ fontSize: 18, color: '#4B5563' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Hľadať zákazky, technikov..."
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: 'var(--dark)',
              background: 'transparent',
            }}
          />
          <kbd style={{
            fontSize: 10,
            color: '#4B5563',
            background: 'var(--g9)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--g7)',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{
          maxHeight: 400,
          overflowY: 'auto',
          padding: query.length >= 2 ? '8px' : '16px 16px',
        }}>
          {query.length < 2 ? (
            <div style={{
              textAlign: 'center',
              color: 'var(--g4)',
              fontSize: 13,
              padding: '8px 0',
            }}>
              Zadajte aspoň 2 znaky...
              <div style={{ fontSize: 11, marginTop: 8, color: 'var(--g6)' }}>
                Hľadá v: číslo zákazky, meno zákazníka, telefón, mesto, meno technika
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', color: 'var(--g4)', fontSize: 13, padding: '12px 0' }}>
              Hľadám...
            </div>
          ) : allItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--g4)', fontSize: 13, padding: '12px 0' }}>
              Žiadne výsledky pre &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Jobs */}
              {results.jobs.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--g4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 8px',
                    marginBottom: 2,
                  }}>
                    Zákazky ({results.jobs.length})
                  </div>
                  {results.jobs.map((job, idx) => {
                    const globalIdx = idx
                    return (
                      <button
                        key={`job-${job.id}`}
                        onClick={() => handleSelect({ type: 'job', data: job })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          background: selectedIdx === globalIdx ? 'var(--g9)' : 'transparent',
                          textAlign: 'left',
                          fontSize: 13,
                          color: 'var(--dark)',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>📋</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {job.reference_number}
                            {job.priority_flag && (
                              <span style={{ marginLeft: 6, fontSize: 11 }}>
                                {job.priority_flag === 'urgent' ? '🔴' :
                                 job.priority_flag === 'vip' ? '⭐' :
                                 job.priority_flag === 'complaint' ? '⚠️' :
                                 job.priority_flag === 'escalated' ? '🔺' : ''}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--g4)' }}>
                            {job.customer_name || '—'}
                            {job.customer_city ? ` · ${job.customer_city}` : ''}
                            {job.category ? ` · ${job.category}` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--g4)',
                          background: 'var(--g9)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                        }}>
                          {CRM_STEP_SHORT[job.crm_step] || `Step ${job.crm_step}`}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {/* Technicians */}
              {results.technicians.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--g4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 8px',
                    marginTop: results.jobs.length > 0 ? 8 : 0,
                    marginBottom: 2,
                  }}>
                    Technici ({results.technicians.length})
                  </div>
                  {results.technicians.map((tech, idx) => {
                    const globalIdx = results.jobs.length + idx
                    return (
                      <button
                        key={`tech-${tech.id}`}
                        onClick={() => handleSelect({ type: 'technician', data: tech })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          background: selectedIdx === globalIdx ? 'var(--g9)' : 'transparent',
                          textAlign: 'left',
                          fontSize: 13,
                          color: 'var(--dark)',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>👷</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {tech.first_name} {tech.last_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--g4)' }}>
                            {tech.phone}
                            {tech.specializations?.length ? ` · ${tech.specializations.slice(0, 3).join(', ')}` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: tech.status === 'active' ? 'var(--success)' : 'var(--g4)',
                          background: 'var(--g9)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}>
                          {tech.status}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          padding: '8px 16px',
          borderTop: '1px solid var(--g8)',
          fontSize: 11,
          color: 'var(--g4)',
        }}>
          <span>↑↓ navigácia</span>
          <span>↵ otvoriť</span>
          <span>esc zavrieť</span>
        </div>
      </div>
    </>
  )
}
