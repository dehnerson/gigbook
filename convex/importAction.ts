import { generateText, Output } from 'ai'
import type { UserContent } from 'ai'
import { ConvexError, v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { IMPORT_PROMPT } from './importModels'
import { aiErrorCode, languageModel } from './lib/ai'
import { draftSchema } from '../src/lib/import/schema'
import { normalizeDraft } from '../src/lib/import/normalize'

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
      const { model, apiKey } = await ctx.runQuery(
        internal.users.internalReadAi,
        { clerkUserId: draft.ownerId },
      )
      const parts: Exclude<UserContent, string> = []
      let knownIds: Array<string> = []
      if (draft.targetVersionId) {
        const sections = await ctx.runQuery(internal.versions.sectionIndex, {
          versionId: draft.targetVersionId,
        })
        knownIds = sections.map((section: { id: string }) => section.id)
        parts.push({
          type: 'text',
          text: `Existing sections: ${JSON.stringify(sections)}. mapping must use these ids or null.`,
        })
      }
      if (draft.sourceKind === 'url') {
        if (!draft.sourceText) throw new ConvexError('INVALID')
        parts.push({ type: 'text', text: await fetchPage(draft.sourceText) })
      } else if (draft.sourceKind === 'photo' || draft.sourceKind === 'pdf') {
        const pdf = draft.sourceKind === 'pdf'
        if (pdf ? !model.pdf : !model.vision)
          throw new ConvexError('MODEL_UNSUPPORTED')
        if (!draft.storageId) throw new ConvexError('INVALID')
        const file = await ctx.storage.get(draft.storageId)
        if (!file) throw new ConvexError('IMPORT_FAILED')
        if (file.size > 8_000_000) throw new ConvexError('INVALID')
        parts.push({
          type: 'file',
          mediaType: file.type || (pdf ? 'application/pdf' : 'image/jpeg'),
          data: new Uint8Array(await file.arrayBuffer()),
        })
        if (draft.sourceText)
          parts.push({ type: 'text', text: draft.sourceText })
      } else if (draft.sourceKind === 'youtube') {
        const meta = draft.youtubeId ? await fetchOembed(draft.youtubeId) : ''
        const text = [meta, draft.sourceText ?? ''].filter(Boolean).join('\n')
        if (!text.trim()) throw new ConvexError('PASTE_REQUIRED')
        parts.push({ type: 'text', text })
      } else {
        if (!draft.sourceText?.trim()) throw new ConvexError('INVALID')
        parts.push({ type: 'text', text: draft.sourceText })
      }
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'structuring',
      })
      const result = await generateText({
        model: languageModel(model, apiKey),
        instructions: IMPORT_PROMPT,
        messages: [{ role: 'user', content: parts }],
        output: Output.object({ schema: draftSchema }),
        providerOptions: { openai: { strictJsonSchema: false } },
        abortSignal: AbortSignal.timeout(90_000),
        maxRetries: 1,
      })
      const parsed = draftSchema.parse(result.output)
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
        error instanceof ConvexError ? String(error.data) : aiErrorCode(error)
      await ctx.runMutation(internal.importDrafts.mark, {
        draftId: args.draftId,
        status: 'failed',
        error: message,
      })
    }
  },
})
