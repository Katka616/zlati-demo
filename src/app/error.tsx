'use client'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }}>
      <h2 style={{ color: 'var(--danger, #dc2626)', marginBottom: '1rem' }}>Nastala chyba</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        {error?.message || 'Niečo sa pokazilo. Skúste to znova.'}
      </p>
      <button onClick={reset} style={{
        padding: '0.75rem 1.5rem', background: 'var(--gold, #d4af37)', color: 'white',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600
      }}>
        Skusit znova
      </button>
    </div>
  )
}
