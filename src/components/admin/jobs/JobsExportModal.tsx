'use client'

type ExportType = 'visible' | 'all' | 'cashflow'

interface JobsExportModalProps {
  exportType: ExportType
  onExportTypeChange: (type: ExportType) => void
  onClose: () => void
  onExport: () => void
}

export default function JobsExportModal({ exportType, onExportTypeChange, onClose, onExport }: JobsExportModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
      />
      {/* Modal box */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: 12, padding: 28, width: 400,
        zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        <h3 style={{ margin: '0 0 20px', fontFamily: 'Cinzel, serif', fontSize: 18, color: '#1a1a1a' }}>
          Exportovať zákazky
        </h3>
        {([
          { value: 'visible', label: 'Viditeľné stĺpce', desc: 'Len stĺpce aktuálne zobrazené v tabuľke' },
          { value: 'all', label: 'Všetky polia', desc: 'Kompletné údaje každej zákazky' },
          { value: 'cashflow', label: 'Cashflow export', desc: 'Príjem, výdavky technikov, marža — pre účtovníctvo' },
        ] as const).map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, cursor: 'pointer' }}>
            <input
              type="radio"
              name="exportType"
              value={opt.value}
              checked={exportType === opt.value}
              onChange={() => onExportTypeChange(opt.value)}
              style={{ marginTop: 3, accentColor: '#bf953f' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 14 }}>{opt.label}</div>
              <div style={{ color: '#4B5563', fontSize: 13, marginTop: 2 }}>{opt.desc}</div>
            </div>
          </label>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 14 }}
          >
            Zrušiť
          </button>
          <button
            onClick={onExport}
            style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#bf953f', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Stiahnuť CSV
          </button>
        </div>
      </div>
    </>
  )
}
