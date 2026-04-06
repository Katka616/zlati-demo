'use client'

import React, { useState, useEffect } from 'react'

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  partner_id: number | null
  color: string
  vat_rate: number | null
  is_active: boolean
}

interface NewCategory {
  name: string
  slug: string
  description: string
  partnerId: number | null
  color: string
  vatRate: number | null
}

const PRESET_COLORS = ['#BF953F', '#D4A843', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0', '#607D8B', '#E91E63']

export default function InvoiceCategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newCat, setNewCat] = useState<NewCategory>({ name: '', slug: '', description: '', partnerId: null, color: '#BF953F', vatRate: null })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editCat, setEditCat] = useState<NewCategory>({ name: '', slug: '', description: '', partnerId: null, color: '#BF953F', vatRate: null })
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/invoice-settings/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      console.error('[InvoiceCategoriesPanel]', err)
    }
  }

  useEffect(() => { load() }, [])

  const slugify = (text: string) =>
    text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const handleCreate = async () => {
    if (!newCat.name || !newCat.slug) return
    try {
      const res = await fetch('/api/admin/invoice-settings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      })
      if (res.ok) {
        setIsAdding(false)
        setNewCat({ name: '', slug: '', description: '', partnerId: null, color: '#BF953F', vatRate: null })
        setToast({ type: 'success', msg: 'Kategória vytvorená' })
        load()
      } else {
        const err = await res.json()
        setToast({ type: 'error', msg: err.error || 'Chyba' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Chyba pri vytváraní' })
    }
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdate = async (id: number) => {
    try {
      const res = await fetch('/api/admin/invoice-settings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editCat }),
      })
      if (res.ok) {
        setEditingId(null)
        setToast({ type: 'success', msg: 'Kategória aktualizovaná' })
        load()
      } else {
        setToast({ type: 'error', msg: 'Chyba pri aktualizácii' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Chyba pri aktualizácii' })
    }
    setTimeout(() => setToast(null), 3000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Naozaj deaktivovať túto kategóriu?')) return
    try {
      await fetch(`/api/admin/invoice-settings/categories?id=${id}`, { method: 'DELETE' })
      setToast({ type: 'success', msg: 'Kategória deaktivovaná' })
      load()
    } catch {
      setToast({ type: 'error', msg: 'Chyba' })
    }
    setTimeout(() => setToast(null), 3000)
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditCat({ name: cat.name, slug: cat.slug, description: cat.description || '', partnerId: cat.partner_id, color: cat.color, vatRate: cat.vat_rate })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--g5)', letterSpacing: '0.05em' }}>
          Kategórie faktúr ({categories.length})
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid var(--gold)',
            background: 'transparent',
            color: 'var(--gold)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          {isAdding ? 'Zrušiť' : '+ Nová kategória'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          marginBottom: 12,
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 13,
          background: toast.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: toast.type === 'success' ? 'var(--success, #22c55e)' : 'var(--danger, #dc2626)',
          border: toast.type === 'success' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(220,38,38,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <div style={{
          padding: 16,
          borderRadius: 10,
          border: '1px solid var(--gold)33',
          background: 'var(--g2)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Názov</label>
              <input
                type="text"
                value={newCat.name}
                onChange={e => {
                  const name = e.target.value
                  setNewCat({ ...newCat, name, slug: slugify(name) })
                }}
                style={inputStyle}
                placeholder="Mesačný batch apríl"
              />
            </div>
            <div style={{ width: 200 }}>
              <label style={labelStyle}>Slug</label>
              <input
                type="text"
                value={newCat.slug}
                onChange={e => setNewCat({ ...newCat, slug: e.target.value })}
                style={inputStyle}
                placeholder="mesacny-batch-april"
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Popis (voliteľný)</label>
            <input
              type="text"
              value={newCat.description}
              onChange={e => setNewCat({ ...newCat, description: e.target.value })}
              style={inputStyle}
              placeholder="Voliteľný popis kategórie"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Farba</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewCat({ ...newCat, color: c })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      border: newCat.color === c ? '2px solid var(--g9)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ width: 120 }}>
              <label style={labelStyle}>DPH %</label>
              <select
                value={newCat.vatRate ?? ''}
                onChange={e => setNewCat({ ...newCat, vatRate: e.target.value ? parseFloat(e.target.value) : null })}
                style={{ ...inputStyle, padding: '8px 10px' }}
              >
                <option value="">Auto</option>
                <option value="12">12 %</option>
                <option value="21">21 %</option>
                <option value="23">23 % (SK)</option>
                <option value="0">0 % (reverse charge)</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} style={saveButtonStyle}>
            Vytvoriť
          </button>
        </div>
      )}

      {/* Categories table */}
      <div style={{ borderRadius: 10, border: '1px solid var(--g3)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>
          <thead>
            <tr style={{ background: 'var(--g2)' }}>
              <th style={thStyle}>Farba</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Názov</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Slug</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Popis</th>
              <th style={thStyle}>DPH</th>
              <th style={thStyle}>Akcie</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid var(--g2)' }}>
                {editingId === cat.id ? (
                  <>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setEditCat({ ...editCat, color: c })}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: c,
                              border: editCat.color === c ? '2px solid var(--g9)' : '1px solid var(--g3)',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <input value={editCat.name} onChange={e => setEditCat({ ...editCat, name: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                    </td>
                    <td style={tdStyle}>
                      <input value={editCat.slug} onChange={e => setEditCat({ ...editCat, slug: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                    </td>
                    <td style={tdStyle}>
                      <input value={editCat.description} onChange={e => setEditCat({ ...editCat, description: e.target.value })} style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <select
                        value={editCat.vatRate ?? ''}
                        onChange={e => setEditCat({ ...editCat, vatRate: e.target.value ? parseFloat(e.target.value) : null })}
                        style={{ ...inputStyle, padding: '4px 6px', fontSize: 12, width: 70 }}
                      >
                        <option value="">Auto</option>
                        <option value="12">12%</option>
                        <option value="21">21%</option>
                        <option value="23">23%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => handleUpdate(cat.id)} style={{ ...actionBtnStyle, color: 'var(--success)' }}>Uložiť</button>
                      <button onClick={() => setEditingId(null)} style={{ ...actionBtnStyle, color: 'var(--g5)' }}>Zrušiť</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: cat.color }} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--g5)', fontFamily: 'monospace', fontSize: 12 }}>{cat.slug}</td>
                    <td style={{ ...tdStyle, color: 'var(--g6)' }}>{cat.description || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>
                      {cat.vat_rate != null ? `${cat.vat_rate} %` : <span style={{ color: 'var(--g4)' }}>auto</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => startEdit(cat)} style={{ ...actionBtnStyle, color: 'var(--gold)' }}>Upraviť</button>
                      <button onClick={() => handleDelete(cat.id)} style={{ ...actionBtnStyle, color: 'var(--danger)' }}>Odstrániť</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--g5)' }}>
                  Žiadne kategórie. Vytvorte prvú kliknutím na "+ Nová kategória".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--g6)',
  marginBottom: 4,
  fontFamily: 'Montserrat, sans-serif',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--g3)',
  background: 'var(--g1)',
  color: 'var(--g9)',
  fontSize: 14,
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--g5)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'center',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
}

const saveButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--gold)',
  color: 'var(--g1)',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'Montserrat, sans-serif',
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 8px',
  fontFamily: 'Montserrat, sans-serif',
}
