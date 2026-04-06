/**
 * Structured logger — consistent [MODULE][CONTEXT] format for Railway logs.
 * Zero dependencies, zero overhead.
 *
 * Usage:
 *   const log = createLogger('Pricing')
 *   log.error('Settlement failed', jobId, err)
 *   // → [Pricing][123] Settlement failed Error: ...
 */

type LogLevel = 'info' | 'warn' | 'error'

function fmt(module: string, context?: string | number): string {
  const prefix = `[${module}]`
  return context !== undefined ? `${prefix}[${context}]` : prefix
}

export function createLogger(module: string) {
  return {
    info(msg: string, context?: string | number, ...args: unknown[]) {
      console.log(fmt(module, context), msg, ...args)
    },
    warn(msg: string, context?: string | number, ...args: unknown[]) {
      console.warn(fmt(module, context), msg, ...args)
    },
    error(msg: string, context?: string | number, ...args: unknown[]) {
      console.error(fmt(module, context), msg, ...args)
    },
  }
}
