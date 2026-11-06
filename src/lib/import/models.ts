export const AI_PROVIDERS = ['google', 'openai', 'anthropic'] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export type AiModel = {
  id: string
  provider: AiProvider
  name: string
  label: string
  vision: boolean
  pdf: boolean
}

export const AI_MODELS: Array<AiModel> = [
  {
    id: 'google/gemini-flash-latest',
    provider: 'google',
    name: 'gemini-flash-latest',
    label: 'Gemini Flash',
    vision: true,
    pdf: true,
  },
  {
    id: 'google/gemini-flash-lite-latest',
    provider: 'google',
    name: 'gemini-flash-lite-latest',
    label: 'Gemini Flash-Lite',
    vision: true,
    pdf: true,
  },
  {
    id: 'openai/gpt-5.4-mini',
    provider: 'openai',
    name: 'gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    vision: true,
    pdf: true,
  },
  {
    id: 'openai/gpt-5.5',
    provider: 'openai',
    name: 'gpt-5.5',
    label: 'GPT-5.5',
    vision: true,
    pdf: true,
  },
  {
    id: 'anthropic/claude-haiku-5-5',
    provider: 'anthropic',
    name: 'claude-haiku-5-5',
    label: 'Claude Haiku 5.5',
    vision: true,
    pdf: true,
  },
  {
    id: 'anthropic/claude-sonnet-5-5',
    provider: 'anthropic',
    name: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    vision: true,
    pdf: true,
  },
]

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export const DEFAULT_MODEL: Record<AiProvider, string> = {
  google: 'google/gemini-flash-latest',
  openai: 'openai/gpt-5.4-mini',
  anthropic: 'anthropic/claude-haiku-5-5',
}

export function modelById(id: string | undefined) {
  return AI_MODELS.find((model) => model.id === id)
}

export function pickModel(
  chosen: string | undefined,
  providersWithKey: Array<AiProvider>,
) {
  const model = modelById(chosen)
  if (model && providersWithKey.includes(model.provider)) return model
  const provider = AI_PROVIDERS.find((item) => providersWithKey.includes(item))
  return provider ? modelById(DEFAULT_MODEL[provider]) : undefined
}
