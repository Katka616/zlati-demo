'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <h2>Nastala chyba</h2>
          <p>{error?.message || 'Neznáma chyba'}</p>
          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Skúsiť znova
          </button>
        </div>
      </body>
    </html>
  )
}
