/**
 * Next.js instrumentation hook — runs once on server startup (Node.js runtime only).
 * Used to auto-run DB schema init + migrations so no manual /api/db/init call is needed.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // DB schema init
  if (process.env.DATABASE_URL) {
    try {
      const { initializeSchema, ensureStatusEngineColumns, ensureJobEmailsTable, ensureCustomMaterialsTable, ensurePerformanceIndexes } = await import('@/lib/db')
      await initializeSchema()
      await ensureStatusEngineColumns()
      await ensureJobEmailsTable()
      await ensureCustomMaterialsTable()
      await ensurePerformanceIndexes()
      console.log('[DB] Auto-migration completed on startup')
    } catch (err) {
      console.error('[DB] Auto-migration failed on startup:', err)
    }
  }

  // Gmail Watch is initialized lazily on first webhook request (see webhook/route.ts)
  // This avoids bundling pg/fs Node-only modules through instrumentation
}
