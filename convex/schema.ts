import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const tabNote = v.object({
  string: v.number(),
  fret: v.number(),
  technique: v.optional(
    v.union(v.literal('h'), v.literal('p'), v.literal('b'), v.literal('/')),
  ),
  bendSemitones: v.optional(v.number()),
})

export const tabMeasure = v.object({
  chordAbove: v.optional(v.string()),
  events: v.array(
    v.object({
      position: v.number(),
      notes: v.array(tabNote),
    }),
  ),
})

export const importSection = v.object({
  name: v.string(),
  notes: v.optional(v.string()),
  parts: v.array(
    v.object({
      kind: v.union(v.literal('chart'), v.literal('tab')),
      label: v.string(),
      chartBody: v.optional(v.string()),
      strumming: v.optional(v.string()),
      measures: v.optional(v.array(tabMeasure)),
    }),
  ),
})

export const importOutput = v.object({
  title: v.string(),
  artist: v.string(),
  concertKey: v.string(),
  timeSignature: v.string(),
  bpm: v.optional(v.number()),
  tuning: v.array(v.string()),
  suggestedCapo: v.number(),
  sections: v.array(importSection),
})

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    locale: v.optional(v.union(v.literal('en'), v.literal('de'))),
    notation: v.optional(v.union(v.literal('en'), v.literal('de'))),
  })
    .index('by_clerk', ['clerkUserId'])
    .index('by_email', ['email']),

  userAiCredentials: defineTable({
    userId: v.id('users'),
    provider: v.literal('google'),
    ciphertext: v.string(),
    last4: v.string(),
  }).index('by_user', ['userId']),

  bands: defineTable({
    name: v.string(),
    createdBy: v.string(),
  }),

  memberships: defineTable({
    bandId: v.id('bands'),
    userId: v.string(),
    role: v.union(v.literal('owner'), v.literal('editor'), v.literal('viewer')),
    name: v.string(),
  })
    .index('by_band', ['bandId'])
    .index('by_user', ['userId']),

  songs: defineTable({
    title: v.string(),
    artist: v.string(),
    createdBy: v.string(),
    bandId: v.optional(v.id('bands')),
  })
    .index('by_creator', ['createdBy'])
    .index('by_band', ['bandId']),

  versions: defineTable({
    songId: v.id('songs'),
    name: v.string(),
    concertKey: v.string(),
    timeSignature: v.string(),
    bpm: v.optional(v.number()),
    tuning: v.array(v.string()),
    suggestedCapo: v.number(),
    timeline: v.array(
      v.object({
        entryId: v.string(),
        sectionId: v.id('sections'),
      }),
    ),
    parentVersionId: v.optional(v.id('versions')),
    bandId: v.optional(v.id('bands')),
    createdBy: v.string(),
    shareToken: v.optional(v.string()),
  })
    .index('by_song', ['songId'])
    .index('by_share', ['shareToken'])
    .index('by_creator', ['createdBy']),

  sections: defineTable({
    versionId: v.id('versions'),
    name: v.string(),
    notes: v.optional(v.string()),
  }).index('by_version', ['versionId']),

  parts: defineTable({
    sectionId: v.id('sections'),
    versionId: v.id('versions'),
    kind: v.union(v.literal('chart'), v.literal('tab')),
    label: v.string(),
    chartBody: v.optional(v.string()),
    strumming: v.optional(v.string()),
    measures: v.optional(v.array(tabMeasure)),
    order: v.number(),
  })
    .index('by_section', ['sectionId'])
    .index('by_version', ['versionId']),

  chordShapes: defineTable({
    versionId: v.id('versions'),
    symbol: v.string(),
    frets: v.array(v.number()),
  }).index('by_version', ['versionId']),

  setlists: defineTable({
    name: v.string(),
    ownerId: v.string(),
    bandId: v.optional(v.id('bands')),
  })
    .index('by_owner', ['ownerId'])
    .index('by_band', ['bandId']),

  setlistItems: defineTable({
    setlistId: v.id('setlists'),
    versionId: v.id('versions'),
    order: v.number(),
  })
    .index('by_setlist', ['setlistId'])
    .index('by_version', ['versionId']),

  jamRooms: defineTable({
    code: v.string(),
    hostUserId: v.string(),
    versionId: v.optional(v.id('versions')),
    setlistId: v.optional(v.id('setlists')),
    setlistIndex: v.number(),
    timelineIndex: v.number(),
    concertTranspose: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_host', ['hostUserId']),

  jamMembers: defineTable({
    roomId: v.id('jamRooms'),
    userId: v.string(),
    name: v.string(),
    capo: v.number(),
    following: v.boolean(),
    visiblePartIds: v.array(v.string()),
    personalVersionId: v.optional(v.id('versions')),
  })
    .index('by_room', ['roomId'])
    .index('by_room_user', ['roomId', 'userId']),

  importDrafts: defineTable({
    ownerId: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('reading'),
      v.literal('structuring'),
      v.literal('ready'),
      v.literal('failed'),
    ),
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
    youtubeId: v.optional(v.string()),
    output: v.optional(importOutput),
    mapping: v.array(v.union(v.string(), v.null())),
    warnings: v.array(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),
})
