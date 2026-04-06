/**
 * AI Custom Fields — Core evaluation engine.
 *
 * Handles prompt template rendering, LLM calls, and auto-trigger logic.
 * Uses fire-and-forget pattern for status change triggers.
 */

import { chatCompletion } from './llm'
import {
  getAiFieldDefinitionById,
  getActiveDefinitionsForCrmStep,
  getActiveDefinitionsForJobCreated,
  getActiveAiFieldDefinitions,
  upsertAiFieldValue,
  getAiFieldValuesForEntity,
  getAiFieldValuesForJob,
  getJobById,
  getPartnerById,
  getJobMessages,
} from './db'
import type { DBAiFieldDefinition, DBAiFieldValue, AiFieldTriggeredBy, AiFieldEntityType, AiFieldDisplayLocation } from './aiFieldTypes'

// Re-export types for convenience
export type { DBAiFieldDefinition, DBAiFieldValue, AiFieldEntityType, AiFieldDisplayLocation }

// ── Template rendering ──────────────────────────────────────────────

interface AiFieldContext {
  job: Record<string, unknown>
  partner: Record<string, unknown> | null
  messages: string
}

/**
 * Build context object from job data for template rendering.
 */
export async function buildAiFieldContext(jobId: number): Promise<AiFieldContext | null> {
  const job = await getJobById(jobId)
  if (!job) return null

  const partner = job.partner_id ? await getPartnerById(job.partner_id) : null

  // Fetch chat messages for context
  // getJobMessages returns DBJobMessage[] directly
  let messagesText = ''
  try {
    const msgs = await getJobMessages(jobId)
    if (msgs && msgs.length > 0) {
      messagesText = msgs
        .slice(-20) // Last 20 messages max
        .map(m => `[${m.from_role}]: ${m.message}`)
        .join('\n')
    }
  } catch {
    // Chat messages optional
  }

  // Flatten job into template-friendly record
  const jobRecord: Record<string, unknown> = {
    id: job.id,
    reference_number: job.reference_number,
    category: job.category,
    status: job.status,
    tech_phase: job.tech_phase,
    urgency: job.urgency,
    crm_step: job.crm_step,
    customer_name: job.customer_name || 'neznámy',
    customer_phone: job.customer_phone || '',
    customer_email: job.customer_email || '',
    customer_address: job.customer_address || '',
    customer_city: job.customer_city || '',
    customer_psc: job.customer_psc || '',
    customer_country: job.customer_country || 'SK',
    description: job.description || 'bez popisu',
    partner_name: partner?.name || 'neznámy partner',
    partner_code: partner?.code || '',
    messages: messagesText || 'žiadne správy',
    custom_fields: job.custom_fields ? JSON.stringify(job.custom_fields) : '{}',
  }

  return {
    job: jobRecord,
    partner: partner ? { id: partner.id, code: partner.code, name: partner.name, country: partner.country } : null,
    messages: messagesText,
  }
}

/**
 * Replace {{job.field}} placeholders in template with actual values.
 */
export function renderPromptTemplate(template: string, context: AiFieldContext): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path: string) => {
    const parts = path.split('.')
    if (parts.length === 2 && parts[0] === 'job') {
      const val = context.job[parts[1]]
      if (val === undefined || val === null) return ''
      return String(val)
    }
    if (parts.length === 2 && parts[0] === 'partner' && context.partner) {
      const val = (context.partner as Record<string, unknown>)[parts[1]]
      if (val === undefined || val === null) return ''
      return String(val)
    }
    return match // Leave unknown placeholders as-is
  })
}

// ── Generation ──────────────────────────────────────────────────────

/**
 * Generate a single AI field value for any entity.
 * Returns the upserted value record.
 */
export async function generateAiField(
  entityType: AiFieldEntityType,
  entityId: number,
  definitionId: number,
  triggeredBy: AiFieldTriggeredBy,
  triggeredCrmStep?: number
): Promise<DBAiFieldValue | null> {
  const definition = await getAiFieldDefinitionById(definitionId)
  if (!definition) {
    console.error(`[AiFields] Definition ${definitionId} not found`)
    return null
  }

  // Build context — currently only 'job' entities have full context
  let context: AiFieldContext | null = null
  if (entityType === 'job') {
    context = await buildAiFieldContext(entityId)
    if (!context) {
      console.error(`[AiFields] Job ${entityId} not found`)
      return null
    }
  } else {
    // Minimal context for non-job entities
    context = { job: {}, partner: null, messages: '' }
  }

  const renderedPrompt = renderPromptTemplate(definition.prompt_template, context)

  // System prompt based on output format
  let systemPrompt: string
  switch (definition.output_format) {
    case 'label':
      systemPrompt = `Odpovedz PRESNE jedným slovom z nasledujúcich možností: ${definition.output_options.join(', ')}. Žiadne iné slovo, žiadne vysvetlenie.`
      break
    case 'number':
      systemPrompt = 'Odpovedz PRESNE jedným číslom. Žiadny text, žiadne jednotky.'
      break
    case 'json':
      systemPrompt = 'Odpovedz PRESNE validným JSON objektom. Žiadny iný text.'
      break
    default:
      systemPrompt = 'Odpovedz stručne a vecne po slovensky.'
  }

  try {
    const result = await chatCompletion({
      systemPrompt,
      userMessage: renderedPrompt,
      model: definition.model,
      maxTokens: definition.max_tokens,
      temperature: definition.temperature,
      jsonMode: definition.output_format === 'json',
      reasoning: 'low',
    })

    if (result === null) {
      return upsertAiFieldValue({
        entity_type: entityType,
        entity_id: entityId,
        definition_id: definitionId,
        value: null,
        is_error: true,
        error_message: 'LLM returned null (API key missing or call failed)',
        model_used: definition.model,
        triggered_by: triggeredBy,
        triggered_crm_step: triggeredCrmStep ?? null,
      })
    }

    // For label type: validate output against allowed options
    let finalValue = result.trim()
    let valueParsed: unknown = null

    if (definition.output_format === 'label') {
      const normalized = finalValue.toLowerCase().replace(/[^a-záčďéíĺľňóôŕšťúýžě]/g, '')
      const match = definition.output_options.find(
        opt => opt.toLowerCase().replace(/[^a-záčďéíĺľňóôŕšťúýžě]/g, '') === normalized
      )
      if (match) {
        finalValue = match
      } else {
        // Try partial match
        const partial = definition.output_options.find(opt => normalized.includes(opt.toLowerCase()))
        finalValue = partial ?? definition.output_options[0] ?? finalValue
      }
    }

    if (definition.output_format === 'number') {
      const num = parseFloat(finalValue.replace(/[^0-9.,\-]/g, '').replace(',', '.'))
      if (!isNaN(num)) {
        finalValue = String(num)
        valueParsed = num
      }
    }

    let jsonParseError = false
    if (definition.output_format === 'json') {
      try {
        valueParsed = JSON.parse(finalValue)
      } catch {
        console.warn(`[AIFields] Malformed JSON from AI for field "${definition.field_key}" on job #${entityId}`)
        jsonParseError = true
      }
    }

    return upsertAiFieldValue({
      entity_type: entityType,
      entity_id: entityId,
      definition_id: definitionId,
      value: finalValue,
      value_parsed: valueParsed,
      is_error: jsonParseError,
      model_used: definition.model,
      tokens_used: null, // OpenAI wrapper doesn't return usage currently
      triggered_by: triggeredBy,
      triggered_crm_step: triggeredCrmStep ?? null,
    })
  } catch (err) {
    console.error(`[AiFields] Generation failed for ${entityType} ${entityId}, field ${definition.field_key}:`, err)
    return upsertAiFieldValue({
      entity_type: entityType,
      entity_id: entityId,
      definition_id: definitionId,
      value: null,
      is_error: true,
      error_message: (err as Error).message,
      model_used: definition.model,
      triggered_by: triggeredBy,
      triggered_crm_step: triggeredCrmStep ?? null,
    })
  }
}

/** Generate a single AI field value for a job — backward-compatible alias */
export async function generateAiFieldForJob(
  jobId: number,
  definitionId: number,
  triggeredBy: AiFieldTriggeredBy,
  triggeredCrmStep?: number
): Promise<DBAiFieldValue | null> {
  return generateAiField('job', jobId, definitionId, triggeredBy, triggeredCrmStep)
}

// ── Trigger functions ───────────────────────────────────────────────

/**
 * Auto-trigger AI fields after a CRM status change.
 * Called fire-and-forget from status routes.
 */
export async function triggerAiFieldsOnStatusChange(jobId: number, newCrmStep: number): Promise<void> {
  try {
    const definitions = await getActiveDefinitionsForCrmStep(newCrmStep)
    if (definitions.length === 0) return

    console.log(`[AiFields] Triggering ${definitions.length} fields for job ${jobId} at CRM step ${newCrmStep}`)

    // Sequential to avoid hammering OpenAI
    for (const def of definitions) {
      await generateAiFieldForJob(jobId, def.id, 'auto', newCrmStep)
    }
  } catch (err) {
    console.error(`[AiFields] triggerOnStatusChange failed for job ${jobId}:`, err)
  }
}

/**
 * Auto-trigger AI fields when a job is created.
 */
export async function triggerAiFieldsOnJobCreated(jobId: number): Promise<void> {
  try {
    const definitions = await getActiveDefinitionsForJobCreated()
    if (definitions.length === 0) return

    console.log(`[AiFields] Triggering ${definitions.length} fields for new job ${jobId}`)

    for (const def of definitions) {
      await generateAiFieldForJob(jobId, def.id, 'auto', 0)
    }
  } catch (err) {
    console.error(`[AiFields] triggerOnJobCreated failed for job ${jobId}:`, err)
  }
}

// ── Read helpers ────────────────────────────────────────────────────

/**
 * Get all AI field definitions with their values for any entity.
 * Optionally filter definitions by display location.
 */
export async function getAiFieldsWithValues(
  entityType: AiFieldEntityType,
  entityId: number,
  location?: AiFieldDisplayLocation
): Promise<{
  definition: DBAiFieldDefinition
  value: DBAiFieldValue | null
}[]> {
  const [definitions, values] = await Promise.all([
    getActiveAiFieldDefinitions(entityType),
    getAiFieldValuesForEntity(entityType, entityId),
  ])

  // If location specified, filter definitions to those that appear in that location
  const filteredDefs = location
    ? definitions.filter(d => d.display_locations.includes(location))
    : definitions

  const valueMap = new Map<number, DBAiFieldValue>()
  for (const v of values) {
    valueMap.set(v.definition_id, v)
  }

  return filteredDefs.map(def => ({
    definition: def,
    value: valueMap.get(def.id) ?? null,
  }))
}

/**
 * Get all AI field definitions with their values for a specific job.
 * Backward-compatible alias — filters by job_sidepanel location.
 */
export async function getAiFieldsWithValuesForJob(jobId: number): Promise<{
  definition: DBAiFieldDefinition
  value: DBAiFieldValue | null
}[]> {
  return getAiFieldsWithValues('job', jobId, 'job_sidepanel')
}
