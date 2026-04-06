'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Search, Loader2, X } from 'lucide-react'

export interface AddressSuggestion {
  street: string
  city: string
  psc: string
  country: string
  lat: number
  lng: number
  displayName: string
}

interface Props {
  country: string  // 'SK' | 'CZ'
  onSelect: (suggestion: AddressSuggestion) => void
  placeholder?: string
  initialValue?: string
  lang?: 'sk' | 'cz'
}

export default function AddressAutocomplete({ country, onSelect, placeholder, initialValue = '', lang = 'sk' }: Props) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const t = lang === 'cz'
    ? { search: 'Hledat adresu (SK + CZ)...', hint: 'Začněte psát ulici a město — hledá v SK i CZ', notFound: 'Adresa nenalezena', searching: 'Hledám...' }
    : { search: 'Hľadať adresu (SK + CZ)...', hint: 'Začnite písať ulicu a mesto — hľadá v SK aj CZ', notFound: 'Adresa nenájdená', searching: 'Hľadám...' }

  const countryFlag = (cc: string) => cc === 'CZ' ? '🇨🇿' : cc === 'SK' ? '🇸🇰' : '🏳️'

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(q)}&country=${country}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setIsOpen(true)
      setSelectedIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [country])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400)
  }

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.street ? `${suggestion.street}, ${suggestion.city}` : suggestion.city)
    setSuggestions([])
    setIsOpen(false)
    onSelect(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--g5)', pointerEvents: 'none'
        }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
          placeholder={placeholder || t.search}
          style={{
            width: '100%', padding: '10px 36px 10px 34px',
            border: '1px solid var(--g3)', borderRadius: '8px',
            fontSize: '14px', fontFamily: "'Montserrat', sans-serif",
            background: 'var(--g1)', color: 'var(--dark)',
            outline: 'none', transition: 'border-color 0.2s',
          }}
        />
        {isLoading && (
          <Loader2 size={16} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--gold)', animation: 'spin 1s linear infinite'
          }} />
        )}
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setIsOpen(false) }}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              color: 'var(--g5)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Hint text */}
      {!isOpen && !query && (
        <div style={{ fontSize: '11px', color: 'var(--g5)', marginTop: '4px', paddingLeft: '2px' }}>
          {t.hint}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: '4px', zIndex: 1000,
          background: 'var(--g1)', border: '1px solid var(--g3)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          maxHeight: '240px', overflow: 'auto',
        }}>
          {suggestions.length === 0 && !isLoading ? (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--g5)', textAlign: 'center' }}>
              {t.notFound}
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={`${s.lat}-${s.lng}-${i}`}
                onClick={() => handleSelect(s)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  width: '100%', padding: '10px 14px',
                  background: i === selectedIndex ? 'var(--g2)' : 'transparent',
                  border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid var(--g2)' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <MapPin size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>
                    {countryFlag(s.country)}{' '}
                    {s.street ? `${s.street}, ${s.city}` : s.city}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--g5)', marginTop: '2px' }}>
                    {s.psc ? `${s.psc} ` : ''}{s.city}, {s.country}
                    {s.lat && s.lng ? ` · ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
