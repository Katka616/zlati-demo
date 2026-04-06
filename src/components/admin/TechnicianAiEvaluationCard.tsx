'use client'

import type { CSSProperties } from 'react'
import type { TechnicianAiEvaluation, TechnicianAiSignal } from '@/lib/technicianAiEvaluation'
import type { TechnicianEmotionEvaluation } from '@/lib/technicianEmotionEvaluation'

interface Props {
  evaluation: TechnicianAiEvaluation | null
  sentiment?: TechnicianEmotionEvaluation | null
  isLoading: boolean
  error: string | null
}

function sentimentBadgeColor(s: string): { bg: string; text: string } {
  switch (s) {
    case 'frustrated': return { bg: '#FEE2E2', text: '#991B1B' }
    case 'stressed': return { bg: '#FEF3C7', text: '#92400E' }
    case 'cooperative': return { bg: '#ECFDF5', text: '#065F46' }
    case 'positive': return { bg: '#DCFCE7', text: '#166534' }
    default: return { bg: 'var(--g1)', text: 'var(--g7)' }
  }
}

function sentimentLabel(s: string): string {
  switch (s) {
    case 'frustrated': return 'Frustrovaný'
    case 'stressed': return 'Stresovaný'
    case 'cooperative': return 'Kooperatívny'
    case 'positive': return 'Pozitívny'
    default: return 'Neutrálny'
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`
}

function formatMinutes(value: number | null): string {
  if (value == null) return '—'
  if (value < 60) return `${Math.round(value)} min`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
}

function getTrendLabel(trend: TechnicianAiEvaluation['relationshipTrend']): string {
  switch (trend) {
    case 'engaged':
      return 'Naklonený firme'
    case 'stable':
      return 'Stabilný'
    case 'at_risk':
      return 'Ohrozený'
    default:
      return 'Stabilný'
  }
}

function getRiskLabel(risk: TechnicianAiEvaluation['riskLevel']): string {
  switch (risk) {
    case 'low':
      return 'Nízke riziko'
    case 'medium':
      return 'Stredné riziko'
    case 'high':
      return 'Vysoké riziko'
    default:
      return 'Stredné riziko'
  }
}

function getToneStyles(tone: TechnicianAiSignal['tone']): CSSProperties {
  switch (tone) {
    case 'good':
      return { background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }
    case 'warning':
      return { background: '#FFFBEB', borderColor: '#FCD34D', color: '#92400E' }
    case 'danger':
      return { background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }
    default:
      return { background: 'var(--g1)', borderColor: 'var(--g3)', color: 'var(--g7)' }
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#B45309'
  return '#DC2626'
}

export default function TechnicianAiEvaluationCard({ evaluation, sentiment, isLoading, error }: Props) {
  return (
    <div className="admin-detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ marginBottom: 0 }}>AI vyhodnotenie technika</h3>
        <span style={{ fontSize: 12, color: 'var(--g4)' }}>
          Interné CRM · posledných {evaluation?.windowDays ?? 90} dní
        </span>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--g7)', marginTop: 12 }}>Načítavam interné vyhodnotenie…</p>
      ) : error ? (
        <div style={{
          marginTop: 12,
          border: '1px solid #FCA5A5',
          background: '#FEF2F2',
          color: '#991B1B',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
        }}>
          Nepodarilo sa načítať AI vyhodnotenie: {error}
        </div>
      ) : !evaluation ? (
        <p style={{ fontSize: 13, color: 'var(--g7)', marginTop: 12 }}>
          Vyhodnotenie nie je dostupné bez produkčných dát.
        </p>
      ) : (
        <>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="status-badge" style={{ background: getScoreColor(evaluation.overallScore), color: '#fff' }}>
              Score {Math.round(evaluation.overallScore)}/100
            </span>
            <span className="status-badge" style={{
              background: evaluation.relationshipTrend === 'at_risk'
                ? '#FEF3C7'
                : evaluation.relationshipTrend === 'engaged'
                  ? '#DCFCE7'
                  : '#F3F4F6',
              color: evaluation.relationshipTrend === 'at_risk'
                ? '#92400E'
                : evaluation.relationshipTrend === 'engaged'
                  ? '#166534'
                  : '#374151',
            }}>
              {getTrendLabel(evaluation.relationshipTrend)}
            </span>
            <span className="status-badge" style={{
              background: evaluation.churnRiskPercent >= 60
                ? '#FEE2E2'
                : evaluation.churnRiskPercent >= 35
                  ? '#FEF3C7'
                  : '#DCFCE7',
              color: evaluation.churnRiskPercent >= 60
                ? '#991B1B'
                : evaluation.churnRiskPercent >= 35
                  ? '#92400E'
                  : '#166534',
            }}>
              Odliv {evaluation.churnRiskPercent} %
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--g9)' }}>{evaluation.headline}</div>
            <p style={{ fontSize: 13, color: 'var(--g7)', margin: '8px 0 0' }}>{evaluation.summary}</p>
            {!evaluation.hasEnoughData && (
              <p style={{ fontSize: 12, color: 'var(--g4)', margin: '8px 0 0' }}>
                Poznámka: vzorka je ešte malá, preto berte trend skôr orientačne.
              </p>
            )}
          </div>

          <div style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {[
              ['Reakčnosť', evaluation.scores.responsiveness],
              ['Spoľahlivosť', evaluation.scores.reliability],
              ['Konzistencia', evaluation.scores.consistency],
            ].map(([label, score]) => (
              <div
                key={label}
                style={{
                  border: '1px solid var(--g3)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: 'var(--g1)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: getScoreColor(Number(score)) }}>
                  {Math.round(Number(score))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}>
            {evaluation.signals.map(signal => (
              <div
                key={signal.label}
                style={{
                  border: '1px solid',
                  borderRadius: 12,
                  padding: '12px 14px',
                  ...getToneStyles(signal.tone),
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{signal.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{signal.value}</span>
                </div>
                <p style={{ fontSize: 12, margin: '8px 0 0', lineHeight: 1.45 }}>
                  {signal.description}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            <div style={{ border: '1px solid var(--g3)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Marketplace detail</div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Zobrazené ponuky</span>
                <span className="admin-detail-value">{evaluation.metrics.marketplace.viewedOffers}/{evaluation.metrics.marketplace.notifiedOffers}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Response rate</span>
                <span className="admin-detail-value">{formatPercent(evaluation.rates.responseRate)}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Acceptance rate</span>
                <span className="admin-detail-value">{formatPercent(evaluation.rates.acceptanceRate)}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Priemerná reakcia</span>
                <span className="admin-detail-value">{formatMinutes(evaluation.metrics.marketplace.avgMinutesToResponse)}</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--g3)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Po prijatí zákazky</div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Dokončené</span>
                <span className="admin-detail-value">{evaluation.metrics.assignments.completed}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Predčasne ukončené</span>
                <span className="admin-detail-value">
                  {evaluation.metrics.assignments.cancelled + evaluation.metrics.assignments.reassigned}
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Early exit rate</span>
                <span className="admin-detail-value">{formatPercent(evaluation.rates.earlyExitRate)}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Aktívne teraz</span>
                <span className="admin-detail-value">{evaluation.metrics.assignments.active}</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--g3)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Zúčtovanie vs appka</div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Skontrolované joby</span>
                <span className="admin-detail-value">{evaluation.metrics.consistency.reviewedJobs}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Zmenené settlementy</span>
                <span className="admin-detail-value">{evaluation.metrics.consistency.changedJobs}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Priemerná odchýlka</span>
                <span className="admin-detail-value">
                  {evaluation.metrics.consistency.avgHoursDelta.toFixed(2)} h / {evaluation.metrics.consistency.avgKmDelta.toFixed(1)} km
                </span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Evidované korekcie</span>
                <span className="admin-detail-value">{evaluation.metrics.consistency.documentedCorrectionEvents}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
              Odporúčaný zásah
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evaluation.recommendedActions.map(action => (
                <div
                  key={action}
                  style={{
                    border: '1px solid var(--g3)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    fontSize: 13,
                    color: 'var(--dark)',
                  }}
                >
                  {action}
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment komunikácie */}
          {sentiment && (
            <div style={{ marginTop: 24, padding: 16, background: 'var(--g1)', borderRadius: 12, border: '1px solid var(--g2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
                  Sentiment komunikácie
                </span>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background: sentimentBadgeColor(sentiment.sentiment).bg,
                  color: sentimentBadgeColor(sentiment.sentiment).text,
                }}>
                  {sentimentLabel(sentiment.sentiment)}
                </span>
              </div>

              {sentiment.summary && (
                <p style={{ fontSize: 13, color: 'var(--g6)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {sentiment.summary}
                </p>
              )}

              {/* Risk pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {sentiment.frustrationRisk && (
                  <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#991B1B' }}>
                    Frustrácia
                  </span>
                )}
                {sentiment.communicationIssue && (
                  <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E' }}>
                    Komunikačný problém
                  </span>
                )}
                {sentiment.workloadComplaint && (
                  <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E' }}>
                    Preťaženie
                  </span>
                )}
              </div>

              {/* Sources */}
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--g5)', marginBottom: 8 }}>
                <span>Správ: {sentiment.sources?.jobMessages || 0}</span>
                <span>DM: {sentiment.sources?.directMessages || 0}</span>
                <span>Hovory: {sentiment.sources?.voicebotCalls || 0}</span>
              </div>

              {/* Evidence */}
              {sentiment.evidence && sentiment.evidence.length > 0 && (
                <div style={{ marginTop: 8, borderTop: '1px solid var(--g2)', paddingTop: 8 }}>
                  {sentiment.evidence.slice(0, 3).map((ev: { scoreImpact: number; text: string }, i: number) => (
                    <div key={i} style={{ padding: '4px 0', fontSize: 12, color: 'var(--g6)' }}>
                      <span style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10,
                        fontWeight: 600, marginRight: 6,
                        background: ev.scoreImpact < 0 ? '#FEE2E2' : '#DCFCE7',
                        color: ev.scoreImpact < 0 ? '#991B1B' : '#166534',
                      }}>
                        {ev.scoreImpact > 0 ? '+' : ''}{ev.scoreImpact}
                      </span>
                      &ldquo;{ev.text}&rdquo;
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended action */}
              {sentiment.recommendedAction && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--g0)', borderRadius: 8, fontSize: 12, color: 'var(--dark)' }}>
                  {sentiment.recommendedAction}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
