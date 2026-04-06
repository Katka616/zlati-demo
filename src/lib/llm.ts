/**
 * LLM Utility — Zdieľaná vrstva pre OpenAI volania.
 *
 * Model: gpt-5.4.
 *
 * Použitie:
 *   const result = await chatCompletion({ systemPrompt, userMessage })
 */

import OpenAI from 'openai'

let _client: OpenAI | null = null

function getClient(): OpenAI | null {
  if (_client) return _client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[LLM] OPENAI_API_KEY not configured — LLM features disabled')
    return null
  }
  _client = new OpenAI({ apiKey, timeout: 60_000 })
  return _client
}

let _openrouterClient: OpenAI | null = null

function getOpenRouterClient(): OpenAI | null {
  if (_openrouterClient) return _openrouterClient
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[LLM] OPENROUTER_API_KEY not configured — OpenRouter models disabled')
    return null
  }
  _openrouterClient = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 60_000,
  })
  return _openrouterClient
}

export function getProviderClient(provider: 'openai' | 'openrouter', apiKey?: string): OpenAI | null {
  // If a dynamic API key is provided, create a one-off client (not cached)
  if (apiKey) {
    return new OpenAI({
      apiKey,
      ...(provider === 'openrouter' ? { baseURL: 'https://openrouter.ai/api/v1' } : {}),
      timeout: 60_000,
    })
  }
  return provider === 'openrouter' ? getOpenRouterClient() : getClient()
}

const DEFAULT_MODEL = 'gpt-5.4'

// ─── Model Tiers ──────────────────────────────────────────────────────────────
// Tier A: cheap classification/formatting tasks via OpenRouter (DeepSeek V3.1)
// Tier B: quality-critical tasks stay on GPT-5.4 (default)
export const TIER_A_MODEL = 'deepseek/deepseek-chat'
export const TIER_A_PROVIDER: 'openai' | 'openrouter' = 'openrouter'

// ─── Feature-to-tier mapping ──────────────────────────────────────────────────

// Feature-to-tier mapping (defaults when no DB override exists)
const FEATURE_TIER_DEFAULTS: Record<string, { model: string; provider: 'openai' | 'openrouter' }> = {
  emotion: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  tech_emotion: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  material_classifier: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  categorize_materials: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  voice_formalize: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  email_matcher: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  diagnostic: { model: DEFAULT_MODEL, provider: 'openai' },
  chatbot: { model: DEFAULT_MODEL, provider: 'openai' },
  ai_mozog: { model: DEFAULT_MODEL, provider: 'openai' },
  chat_context: { model: DEFAULT_MODEL, provider: 'openai' },
  chat_supervisor: { model: DEFAULT_MODEL, provider: 'openai' },
  invoice_extractor: { model: DEFAULT_MODEL, provider: 'openai' },
  ai_fields: { model: DEFAULT_MODEL, provider: 'openai' },
  insurance_details: { model: DEFAULT_MODEL, provider: 'openai' },
  briefing: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  brain_bridge: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
  escalation: { model: TIER_A_MODEL, provider: TIER_A_PROVIDER },
}

// Cache: refreshed every 5 minutes
let _modelOverridesCache: Record<string, { model_id: string; provider: string }> | null = null
let _modelOverridesCacheAt = 0

export async function getModelForFeature(feature: string): Promise<{ model: string; provider: 'openai' | 'openrouter' }> {
  // Check DB override (cached 5 min)
  const now = Date.now()
  if (!_modelOverridesCache || now - _modelOverridesCacheAt > 5 * 60 * 1000) {
    try {
      const { query } = await import('@/lib/db')
      const res = await query('SELECT model_overrides FROM ai_brain_settings WHERE id = 1')
      _modelOverridesCache = res.rows[0]?.model_overrides ?? {}
      _modelOverridesCacheAt = now
    } catch {
      _modelOverridesCache = {}
      _modelOverridesCacheAt = now
    }
  }

  const override = _modelOverridesCache?.[feature]
  if (override?.model_id && override?.provider) {
    return {
      model: override.model_id,
      provider: override.provider as 'openai' | 'openrouter',
    }
  }

  // Fall back to tier defaults
  return FEATURE_TIER_DEFAULTS[feature] ?? { model: DEFAULT_MODEL, provider: 'openai' }
}

export { FEATURE_TIER_DEFAULTS }

type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

interface ChatCompletionOpts {
  systemPrompt: string
  userMessage: string
  model?: string             // default: 'gpt-5.4'
  maxTokens?: number         // default: 500
  temperature?: number       // default: 0.3
  jsonMode?: boolean         // default: false
  reasoning?: ReasoningEffort // ignored — gpt-5.4 does not support reasoning parameter
  provider?: 'openai' | 'openrouter'  // default 'openai'
  apiKey?: string                      // dynamic API key (overrides env)
  feature?: string                     // for cost tracking (e.g. 'emotion', 'diagnostic')
}

function trackModelUsage(feature: string, model: string, provider: string, inputChars: number, outputChars: number, success: boolean) {
  // Estimate tokens from chars (~4 chars per token)
  const inputTokens = Math.ceil(inputChars / 4)
  const outputTokens = Math.ceil(outputChars / 4)

  // Rough cost estimation per 1M tokens
  const COST_PER_1M: Record<string, { input: number; output: number }> = {
    'gpt-5.4': { input: 2.50, output: 10.00 },
    'gpt-5.4-mini': { input: 0.40, output: 1.60 },
    'gpt-5.4-nano': { input: 0.10, output: 0.40 },
    'deepseek/deepseek-chat': { input: 0.27, output: 1.10 },
    'deepseek/deepseek-reasoner': { input: 0.55, output: 2.19 },
    'qwen/qwen-3.6-plus': { input: 0.30, output: 1.20 },
  }

  const pricing = COST_PER_1M[model] ?? COST_PER_1M['gpt-5.4']
  const estimatedCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000

  // Fire and forget — never block the caller
  import('@/lib/db').then(({ query }) => {
    query(
      `INSERT INTO ai_model_usage (feature, model_id, provider, input_tokens, output_tokens, estimated_cost_usd, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [feature, model, provider, inputTokens, outputTokens, estimatedCost, success]
    ).catch(err => console.error('[LLM] trackModelUsage error:', (err as Error).message))
  }).catch(() => {})
}

/**
 * Call OpenAI chat completion. Returns the response text, or null if API fails.
 * Callers should implement fallback logic when null is returned.
 */
export async function chatCompletion(opts: ChatCompletionOpts): Promise<string | null> {
  const client = getProviderClient(opts.provider ?? 'openai', opts.apiKey)
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: opts.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userMessage },
      ],
      max_completion_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.3,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

    const result = response.choices[0]?.message?.content?.trim() ?? null

    if (opts.feature) {
      const inputChars = (opts.systemPrompt?.length ?? 0) + (opts.userMessage?.length ?? 0)
      const outputChars = result?.length ?? 0
      trackModelUsage(opts.feature, opts.model ?? DEFAULT_MODEL, opts.provider ?? 'openai', inputChars, outputChars, true)
    }

    return result
  } catch (err) {
    console.error('[LLM] Chat completion failed:', (err as Error).message)
    if (opts.feature) {
      const inputChars = (opts.systemPrompt?.length ?? 0) + (opts.userMessage?.length ?? 0)
      trackModelUsage(opts.feature, opts.model ?? DEFAULT_MODEL, opts.provider ?? 'openai', inputChars, 0, false)
    }
    return null
  }
}

/**
 * Call OpenAI vision completion — send image(s) and get structured response.
 */
export async function visionCompletion(opts: {
  systemPrompt: string
  userMessage: string
  imageDataUrls: string[]    // base64 data URLs: "data:image/jpeg;base64,..."
  model?: string             // default: 'gpt-5.4'
  maxTokens?: number         // default: 1000
  temperature?: number       // default: 0.1
  jsonMode?: boolean         // default: false
  reasoning?: ReasoningEffort // ignored — gpt-5.4 does not support reasoning parameter
}): Promise<string | null> {
  const client = getClient()
  if (!client) return null

  try {
    const content: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [
      { type: 'text', text: opts.userMessage },
    ]

    for (const dataUrl of opts.imageDataUrls) {
      content.push({
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'high' },
      })
    }

    const response = await client.chat.completions.create({
      model: opts.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: content as never },
      ],
      max_completion_tokens: opts.maxTokens ?? 1000,
      temperature: opts.temperature ?? 0.1,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })

    return response.choices[0]?.message?.content?.trim() ?? null
  } catch (err) {
    console.error('[LLM] Vision completion failed:', (err as Error).message)
    return null
  }
}

/**
 * Parse JSON from LLM response, with fallback to null.
 */
export function parseLLMJson<T>(text: string | null): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    console.warn('[LLM] Failed to parse JSON response:', text.substring(0, 200))
    return null
  }
}
