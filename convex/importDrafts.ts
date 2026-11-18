import { generateText } from 'ai'
import { v } from 'convex/values'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { aiProvider, importOutput } from './schema'
import { aiErrorCode, languageModel } from './lib/ai'
import {
  canEditBand,
  canEditVersion,
  canReadSong,
  findVisibleSong,
  openGate,
  requireIdentity,
  songOfVersion,
} from './lib/access'
import { fail } from './lib/errors'
import { insertSong, uniqueVersionName } from './lib/songs'
import {
  BASS_TUNING,
  GUITAR_PART_ID,
  genericGuitarName,
} from '../src/lib/parts'
import type { StoredPart } from '../src/lib/parts'
import { readAiKey } from './users'

const HOUR = 60 * 60 * 1000
const LIMIT = 15

function partForLine(
  parts: Array<StoredPart>,
  line: { part: string; instrument: 'guitar' | 'bass' },
) {
  if (line.instrument === 'guitar' && genericGuitarName(line.part)) {
    if (!parts.some((part) => part.id === GUITAR_PART_ID))
      parts.push({ id: GUITAR_PART_ID, instrument: 'guitar' })
    return GUITAR_PART_ID
  }
  const name = line.part.trim().slice(0, 60)
  const existing = parts.find(
    (part) =>
      part.instrument === line.instrument &&
      (part.name ?? '').toLowerCase() === name.toLowerCase(),
  )
  if (existing) return existing.id
  const id = crypto.randomUUID().slice(0, 8)
  parts.push({
    id,
    instrument: line.instrument,
    ...(name ? { name } : {}),
    ...(line.instrument === 'bass' ? { tuning: [...BASS_TUNING] } : {}),
  })
  return id
}

function played(repeat: number | undefined) {
  if (!repeat || repeat <= 1) return undefined
  return Math.min(Math.round(repeat), 16)
}

async function editableTarget(
  ctx: MutationCtx,
  versionId: Id<'versions'> | undefined,
) {
  if (!versionId) return null
  const version = await ctx.db.get(versionId)
  if (!version) fail('NOT_FOUND')
  await canEditVersion(ctx, version)
  return version
}

function versionArtist(performer: string) {
  const name = performer.trim()
  const ignored = ['', 'unknown']
  return ignored.includes(name.toLowerCase()) ? undefined : name
}

async function checkAiQuota(ctx: MutationCtx, ownerId: string) {
  const recent = await ctx.db
    .query('importDrafts')
    .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
    .collect()
  const count = recent.filter(
    (draft) => draft.createdAt > Date.now() - HOUR,
  ).length
  if (count >= LIMIT) fail('RATE_LIMIT')
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    sourceKind: v.union(
      v.literal('paste'),
      v.literal('photo'),
      v.literal('pdf'),
      v.literal('url'),
      v.literal('youtube'),
    ),
    sourceText: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    targetVersionId: v.optional(v.id('versions')),
    homeBandId: v.optional(v.id('bands')),
    youtubeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const { model } = await readAiKey(ctx, identity.subject)
    if (
      (args.sourceKind === 'pdf' && !model.pdf) ||
      (args.sourceKind === 'photo' && !model.vision)
    )
      fail('MODEL_UNSUPPORTED')
    await editableTarget(ctx, args.targetVersionId)
    if (args.homeBandId) await canEditBand(ctx, args.homeBandId)
    await checkAiQuota(ctx, identity.subject)
    const text = args.sourceText?.slice(0, 40_000)
    const draftId = await ctx.db.insert('importDrafts', {
      ownerId: identity.subject,
      status: 'queued',
      sourceKind: args.sourceKind,
      sourceText: text,
      storageId: args.storageId,
      targetVersionId: args.targetVersionId,
      homeBandId: args.homeBandId,
      youtubeId: args.youtubeId,
      mapping: [],
      warnings: [],
      createdAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.importAction.run, { draftId })
    return draftId
  },
})

export const get = query({
  args: { draftId: v.id('importDrafts') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || draft.ownerId !== identity.subject) fail('NOT_FOUND')
    const home = draft.homeBandId ? await ctx.db.get(draft.homeBandId) : null
    const target = draft.targetVersionId
      ? await ctx.db.get(draft.targetVersionId)
      : null
    const targetBand = target?.bandId ? await ctx.db.get(target.bandId) : null
    return {
      ...draft,
      homeBandName: home?.name ?? null,
      targetBandName: targetBand?.name ?? null,
      markBandId: target ? (target.bandId ?? null) : (draft.homeBandId ?? null),
    }
  },
})

export const updateOutput = mutation({
  args: {
    draftId: v.id('importDrafts'),
    output: importOutput,
    mapping: v.array(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || draft.ownerId !== identity.subject) fail('FORBIDDEN')
    await ctx.db.patch(draft._id, {
      output: args.output,
      mapping: args.mapping,
    })
  },
})

export const discard = mutation({
  args: { draftId: v.id('importDrafts') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || draft.ownerId !== identity.subject) fail('FORBIDDEN')
    if (draft.storageId) await ctx.storage.delete(draft.storageId)
    await ctx.db.delete(draft._id)
  },
})

export const save = mutation({
  args: {
    draftId: v.id('importDrafts'),
    intoSongId: v.optional(v.id('songs')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const draft = await ctx.db.get(args.draftId)
    if (!draft || draft.ownerId !== identity.subject || !draft.output)
      fail('FORBIDDEN')
    const output = draft.output
    const version = await editableTarget(ctx, draft.targetVersionId)
    if (version) {
      const timeline = [...version.timeline]
      const parts: Array<StoredPart> = [...(version.parts ?? [])]
      for (const [index, section] of output.sections.entries()) {
        const mapped = draft.mapping[index]
        let sectionId = mapped ? ctx.db.normalizeId('sections', mapped) : null
        const mappedSection = sectionId ? await ctx.db.get(sectionId) : null
        if (!mappedSection || mappedSection.versionId !== version._id)
          sectionId = null
        if (!sectionId) {
          sectionId = await ctx.db.insert('sections', {
            versionId: version._id,
            name: section.name,
            notes: section.notes,
            chartBody: section.chartBody,
            strumming: section.strumming,
          })
          timeline.push({
            entryId: crypto.randomUUID(),
            sectionId,
            ...(played(section.repeat)
              ? { repeat: played(section.repeat) }
              : {}),
          })
        } else if (!mappedSection?.chartBody && section.chartBody) {
          await ctx.db.patch(sectionId, {
            chartBody: section.chartBody,
            strumming: mappedSection?.strumming ?? section.strumming,
          })
        }
        const taken = new Set(
          (
            await ctx.db
              .query('lines')
              .withIndex('by_section', (q) => q.eq('sectionId', sectionId))
              .collect()
          ).map((line) => line.partId),
        )
        for (const line of section.lines) {
          const partId = partForLine(parts, line)
          if (taken.has(partId)) continue
          taken.add(partId)
          await ctx.db.insert('lines', {
            sectionId,
            versionId: version._id,
            partId,
            measures: line.measures,
            rhythmGuessed: line.rhythmGuessed,
          })
        }
      }
      await songOfVersion(ctx, version)
      const artist = version.artist ?? versionArtist(output.artist)
      await ctx.db.patch(version._id, { timeline, artist, parts })
      if (draft.storageId) await ctx.storage.delete(draft.storageId)
      await ctx.db.delete(draft._id)
      return { songId: version.songId, versionId: version._id }
    }

    let song: Doc<'songs'> | null
    const owner = {
      userId: identity.subject,
      bandId: draft.homeBandId,
    }
    if (args.intoSongId) {
      song = await ctx.db.get(args.intoSongId)
      if (!song) fail('NOT_FOUND')
      await canReadSong(ctx, song)
    } else {
      if (draft.homeBandId) await canEditBand(ctx, draft.homeBandId)
      const gate = await openGate(ctx, identity.subject)
      const existing = await findVisibleSong(ctx, gate, output.title)
      if (existing) return { existing: existing._id, title: existing.title }

      const songId = await insertSong(ctx, {
        title: output.title,
        createdBy: identity.subject,
      })
      song = await ctx.db.get(songId)
      if (!song) fail('NOT_FOUND')
    }
    const songId = song._id
    const versionId = await ctx.db.insert('versions', {
      songId,
      name: await uniqueVersionName(ctx, songId, 'Imported', owner),
      artist: versionArtist(output.artist),
      concertKey: output.concertKey,
      timeSignature: output.timeSignature,
      bpm: output.bpm,
      tuning: output.tuning,
      suggestedCapo: output.suggestedCapo,
      timeline: [],
      createdBy: identity.subject,
      ...(draft.homeBandId ? { bandId: draft.homeBandId } : {}),
    })
    const parts: Array<StoredPart> = []
    const timeline = []
    for (const section of output.sections) {
      const sectionId = await ctx.db.insert('sections', {
        versionId,
        name: section.name,
        notes: section.notes,
        chartBody: section.chartBody,
        strumming: section.strumming,
      })
      timeline.push({
        entryId: crypto.randomUUID(),
        sectionId,
        ...(played(section.repeat) ? { repeat: played(section.repeat) } : {}),
      })
      const taken = new Set<string>()
      for (const line of section.lines) {
        const partId = partForLine(parts, line)
        if (taken.has(partId)) continue
        taken.add(partId)
        await ctx.db.insert('lines', {
          sectionId,
          versionId,
          partId,
          measures: line.measures,
          rhythmGuessed: line.rhythmGuessed,
        })
      }
    }
    await ctx.db.patch(versionId, { timeline, parts })
    if (draft.storageId) await ctx.storage.delete(draft.storageId)
    await ctx.db.delete(draft._id)
    return { songId, versionId }
  },
})

export const mark = internalMutation({
  args: {
    draftId: v.id('importDrafts'),
    status: v.union(
      v.literal('queued'),
      v.literal('reading'),
      v.literal('structuring'),
      v.literal('ready'),
      v.literal('failed'),
    ),
    output: v.optional(importOutput),
    warnings: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    sourceText: v.optional(v.string()),
    mapping: v.optional(v.array(v.union(v.string(), v.null()))),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId)
    if (!draft) return
    await ctx.db.patch(draft._id, {
      status: args.status,
      output: args.output ?? draft.output,
      warnings: args.warnings ?? draft.warnings,
      error: args.error,
      sourceText: args.sourceText ?? draft.sourceText,
      mapping: args.mapping ?? draft.mapping,
    })
  },
})

export const load = internalQuery({
  args: { draftId: v.id('importDrafts') },
  handler: async (ctx, args) => ctx.db.get(args.draftId),
})

export const testKey = action({
  args: { provider: aiProvider },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const { model, apiKey } = await ctx.runQuery(
      internal.users.internalReadAi,
      {
        clerkUserId: identity.subject,
        provider: args.provider,
      },
    )
    try {
      await generateText({
        model: languageModel(model, apiKey),
        prompt: 'Reply with the word ready.',
        maxOutputTokens: 16,
        abortSignal: AbortSignal.timeout(20_000),
        maxRetries: 0,
      })
    } catch (error) {
      const code = aiErrorCode(error)
      fail(code === 'AI_RATE_LIMIT' ? code : 'INVALID_KEY')
    }
    return { ok: true }
  },
})
