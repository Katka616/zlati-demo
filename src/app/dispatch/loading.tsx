export default function DispatchLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--border, #E5E7EB)',
        borderTopColor: 'var(--gold, #d4af37)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
