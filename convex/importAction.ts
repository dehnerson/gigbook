import { ConvexError, v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { IMPORT_PROMPT, TEXT_MODEL, VISION_MODEL } from './importModels'
import { draftSchema } from '../src/lib/import/schema'
import { normalizeDraft } from '../src/lib/import/normalize'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const size = 0x8000
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size))
  }
  return btoa(binary)
}

function pageText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPage(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConvexError('INVALID')
  }
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'text/html,text/plain' },
  })
  if (response.status === 401 || response.status === 403) {
    throw new ConvexError('PASTE_REQUIRED')
  }
  if (!response.ok) throw new ConvexError('IMPORT_FAILED')
  const html = await response.text()
  if (html.length > 200_000) throw new ConvexError('INVALID')
  const plain = pageText(html).slice(0, 40_000)
  if (plain.length < 80) throw new ConvexError('PASTE_REQUIRED')
  return plain
}

async function fetchOembed(youtubeId: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`,
    { signal: AbortSignal.timeout(8000) },
  )
  if (!response.ok) return ''
  const payload = (await response.json()) as {
    title?: string
    author_name?: string
  }
  return [payload.title, payload.author_name].filter(Boolean).join(' — ')
}

async function gemini(
  apiKey: string,
  model: string,
  parts: Array<Record<string, unknown>>,
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(50_000),
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )
  if (!response.ok) throw new ConvexError('IMPORT_FAILED')
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? ''
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(fenced?.[1] ?? trimmed)
}

export const run = internalAction({
  args: { draftId: v.id('importDrafts') },
  handler: async (ctx, args) => {
    try {
      const draft = await ctx.runQuery(internal.importDrafts.load, {
        draftId: args.draftId,
      })
      if (!draft) return
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'reading',
      })
      const apiKey = await ctx.runQuery(internal.users.internalReadAiKey, {
        clerkUserId: draft.ownerId,
      })
      const parts: Array<Record<string, unknown>> = [{ text: IMPORT_PROMPT }]
      let knownIds: Array<string> = []
      if (draft.targetVersionId) {
        const sections = await ctx.runQuery(internal.versions.sectionIndex, {
          versionId: draft.targetVersionId,
        })
        knownIds = sections.map((section: { id: string }) => section.id)
        parts.push({
          text: `Existing sections: ${JSON.stringify(sections)}. mapping must use these ids or null.`,
        })
      }
      const visual = draft.sourceKind === 'photo' || draft.sourceKind === 'pdf'
      if (draft.sourceKind === 'url') {
        if (!draft.sourceText) throw new ConvexError('INVALID')
        parts.push({ text: await fetchPage(draft.sourceText) })
      } else if (visual) {
        if (!draft.storageId) throw new ConvexError('INVALID')
        const file = await ctx.storage.get(draft.storageId)
        if (!file) throw new ConvexError('IMPORT_FAILED')
        if (file.size > 8_000_000) throw new ConvexError('INVALID')
        const bytes = new Uint8Array(await file.arrayBuffer())
        const mimeType =
          file.type ||
          (draft.sourceKind === 'pdf' ? 'application/pdf' : 'image/jpeg')
        parts.push({ inlineData: { mimeType, data: bytesToBase64(bytes) } })
        if (draft.sourceText) parts.push({ text: draft.sourceText })
      } else if (draft.sourceKind === 'youtube') {
        const meta = draft.youtubeId ? await fetchOembed(draft.youtubeId) : ''
        const text = [meta, draft.sourceText ?? ''].filter(Boolean).join('\n')
        if (!text.trim()) throw new ConvexError('PASTE_REQUIRED')
        parts.push({ text })
      } else {
        if (!draft.sourceText?.trim()) throw new ConvexError('INVALID')
        parts.push({ text: draft.sourceText })
      }
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'structuring',
      })
      const parsed = draftSchema.parse(
        await gemini(apiKey, visual ? VISION_MODEL : TEXT_MODEL, parts),
      )
      const normalized = normalizeDraft(parsed)
      const allowed = new Set(knownIds)
      const mapping = (parsed.mapping ?? []).map((id) =>
        id && allowed.has(id) ? id : null,
      )
      while (mapping.length < normalized.output.sections.length)
        mapping.push(null)
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'ready',
        output: normalized.output,
        warnings: normalized.warnings,
        mapping: mapping.slice(0, normalized.output.sections.length),
      })
    } catch (error) {
      const message =
        error instanceof ConvexError ? String(error.data) : 'IMPORT_FAILED'
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'failed',
        error: message,
      })
    }
  },
})
