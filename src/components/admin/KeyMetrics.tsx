'use client'

/**
 * KeyMetrics — sidebar widget s 6 kľúčovými metrikami zákazky.
 * Portovaný z crm-playground.html (.metrics-card).
 */

interface Metric {
  value: string
  label: string
  color?: string
}

interface KeyMetricsProps {
  metrics: Metric[]
}

export default function KeyMetrics({ metrics }: KeyMetricsProps) {
  return (
    <div className="crm-metrics-card">
      <h3>Kľúčové metriky</h3>
      <div className="crm-metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} className="crm-metric-item">
            <div className="crm-metric-value" style={m.color ? { color: m.color } : undefined}>
              {m.value}
            </div>
            <div className="crm-metric-label">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
