/**
 * Resilience utilities — retry, circuit breaker, exponential backoff.
 *
 * Used for external service calls (SMS, AI, geocoding) to make
 * the app self-healing when services are temporarily down.
 */

// ── Retry with exponential backoff ───────────────────────────────────

export interface RetryOptions {
  /** Max number of retries (default: 2) */
  maxRetries?: number
  /** Base delay in ms (default: 500) */
  baseDelay?: number
  /** Max delay in ms (default: 5000) */
  maxDelay?: number
  /** Label for logging */
  label?: string
  /** Only retry if this returns true for the error */
  shouldRetry?: (err: Error) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelay = 500,
    maxDelay = 5000,
    label = 'operation',
    shouldRetry = () => true,
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt >= maxRetries || !shouldRetry(lastError)) {
        break
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      // Add jitter (+-25%) to prevent thundering herd
      const jitter = delay * (0.75 + Math.random() * 0.5)
      console.warn(`[RETRY] ${label} attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${Math.round(jitter)}ms`)
      await new Promise(r => setTimeout(r, jitter))
    }
  }

  throw lastError!
}

// ── Circuit Breaker ──────────────────────────────────────────────────

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number
  /** Time in ms to wait before half-opening (default: 60000 = 1 min) */
  resetTimeout?: number
  /** Label for logging */
  label?: string
}

type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailure = 0
  private readonly failureThreshold: number
  private readonly resetTimeout: number
  private readonly label: string

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5
    this.resetTimeout = options.resetTimeout ?? 60_000
    this.label = options.label ?? 'service'
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open -> half-open
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure >= this.resetTimeout) {
        this.state = 'half-open'
        console.log(`[CIRCUIT] ${this.label}: half-open — testing service`)
      } else {
        throw new Error(`[CIRCUIT] ${this.label}: circuit open — service temporarily unavailable`)
      }
    }

    try {
      const result = await fn()
      // Success — reset on half-open, decrement on closed
      if (this.state === 'half-open') {
        console.log(`[CIRCUIT] ${this.label}: closed — service recovered`)
        this.state = 'closed'
        this.failures = 0
      } else if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1)
      }
      return result
    } catch (err) {
      this.failures++
      this.lastFailure = Date.now()

      if (this.failures >= this.failureThreshold) {
        this.state = 'open'
        console.error(`[CIRCUIT] ${this.label}: OPEN — ${this.failures} consecutive failures, pausing for ${this.resetTimeout / 1000}s`)
      }

      throw err
    }
  }

  /** Get current circuit state for health checks */
  getState(): { state: CircuitState; failures: number } {
    // Auto-check if should transition to half-open
    if (this.state === 'open' && Date.now() - this.lastFailure >= this.resetTimeout) {
      this.state = 'half-open'
    }
    return { state: this.state, failures: this.failures }
  }
}
