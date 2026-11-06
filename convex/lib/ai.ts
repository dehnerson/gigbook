import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { APICallError } from 'ai'
import type { AiModel } from '../../src/lib/import/models'

export function languageModel(model: AiModel, apiKey: string) {
  if (model.provider === 'openai') return createOpenAI({ apiKey })(model.name)
  if (model.provider === 'anthropic')
    return createAnthropic({ apiKey })(model.name)
  return createGoogle({ apiKey })(model.name)
}

export function aiErrorCode(error: unknown) {
  if (!APICallError.isInstance(error)) return 'IMPORT_FAILED'
  if (error.statusCode === 401 || error.statusCode === 403) return 'INVALID_KEY'
  if (error.statusCode === 429) return 'AI_RATE_LIMIT'
  return 'IMPORT_FAILED'
}
