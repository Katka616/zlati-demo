'use client'
export default function DispatchError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', fontFamily: 'Montserrat, sans-serif', minHeight: '60vh', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
      <h2 style={{ color: 'var(--danger, #dc2626)', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Chyba aplikacie</h2>
      <p style={{ color: 'var(--g3, #6b7280)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {error?.message || 'Niečo sa pokazilo.'}
      </p>
      <button onClick={reset} style={{
        padding: '0.875rem 2rem', background: 'var(--gold, #d4af37)', color: 'white',
        border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
        width: '100%', maxWidth: '280px', margin: '0 auto'
      }}>
        Skúsiť znova
      </button>
    </div>
  )
}
