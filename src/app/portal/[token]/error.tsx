'use client'

export default function PortalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      padding: '2rem 1.5rem',
      textAlign: 'center',
      fontFamily: 'Montserrat, sans-serif',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;&#65039;</div>
      <h2 style={{ color: 'var(--danger, #dc2626)', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>
        Chyba pri načítaní
      </h2>
      <p style={{ color: 'var(--g6, #4B5563)', marginBottom: '1.5rem', fontSize: '0.9rem', maxWidth: 320 }}>
        {error?.message || 'Niečo sa pokazilo. Skúste znova alebo kontaktujte podporu.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.875rem 2rem',
          background: 'var(--gold, #d4af37)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 600,
          maxWidth: '280px',
          width: '100%',
        }}
      >
        Skúsiť znova
      </button>
    </div>
  )
}
