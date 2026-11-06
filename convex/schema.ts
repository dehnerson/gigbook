import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const aiProvider = v.union(
  v.literal('google'),
  v.literal('openai'),
  v.literal('anthropic'),
)

export const tabNote = v.object({
  s: v.number(),
  f: v.number(),
  t: v.optional(
    v.union(
      v.literal('h'),
      v.literal('p'),
      v.literal('b'),
      v.literal('/'),
      v.literal('\\'),
      v.literal('~'),
    ),
  ),
  bend: v.optional(v.number()),
})

export const tabBeat = v.object({
  d: v.union(
    v.literal(1),
    v.literal(2),
    v.literal(4),
    v.literal(8),
    v.literal(16),
    v.literal(32),
  ),
  dot: v.optional(v.literal(true)),
  rest: v.optional(v.literal(true)),
  chord: v.optional(v.string()),
  notes: v.array(tabNote),
})

export const tabMeasure = v.object({
  beats: v.array(tabBeat),
  repeat: v.optional(
    v.object({
      start: v.optional(v.literal(true)),
      times: v.optional(v.number()),
    }),
  ),
  ending: v.optional(v.number()),
})

// Old shape, kept readable until migrations:tabBeats has run on every deployment.
const legacyTabMeasure = v.object({
  chordAbove: v.optional(v.string()),
  events: v.array(
    v.object({
      position: v.number(),
      notes: v.array(
        v.object({
          string: v.number(),
          fret: v.number(),
          technique: v.optional(
            v.union(
              v.literal('h'),
              v.literal('p'),
              v.literal('b'),
              v.literal('/'),
            ),
          ),
          bendSemitones: v.optional(v.number()),
        }),
      ),
    }),
  ),
})

const storedTabMeasure = v.union(tabMeasure, legacyTabMeasure)

function outputWith(measure: typeof tabMeasure | typeof storedTabMeasure) {
  return v.object({
    title: v.string(),
    artist: v.string(),
    concertKey: v.string(),
    timeSignature: v.string(),
    bpm: v.optional(v.number()),
    tuning: v.array(v.string()),
    suggestedCapo: v.number(),
    sections: v.array(
      v.object({
        name: v.string(),
        notes: v.optional(v.string()),
        parts: v.array(
          v.object({
            kind: v.union(v.literal('chart'), v.literal('tab')),
            label: v.string(),
            chartBody: v.optional(v.string()),
            strumming: v.optional(v.string()),
            measures: v.optional(v.array(measure)),
            rhythmGuessed: v.optional(v.boolean()),
          }),
        ),
      }),
    ),
  })
}

export const importOutput = outputWith(tabMeasure)
const storedImportOutput = outputWith(storedTabMeasure)

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    locale: v.optional(v.union(v.literal('en'), v.literal('de'))),
    notation: v.optional(v.union(v.literal('en'), v.literal('de'))),
    aiModel: v.optional(v.string()),
  })
    .index('by_clerk', ['clerkUserId'])
    .index('by_email', ['email']),

  userAiCredentials: defineTable({
    userId: v.id('users'),
    provider: aiProvider,
    ciphertext: v.string(),
    last4: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_provider', ['userId', 'provider']),

  bands: defineTable({
    name: v.string(),
    createdBy: v.string(),
  }),

  memberships: defineTable({
    bandId: v.id('bands'),
    userId: v.string(),
    role: v.union(v.literal('owner'), v.literal('editor'), v.literal('viewer')),
    name: v.optional(v.string()),
  })
    .index('by_band', ['bandId'])
    .index('by_user', ['userId']),

  songs: defineTable({
    title: v.string(),
    artist: v.string(),
    key: v.optional(v.string()),
    createdBy: v.string(),
    bandId: v.optional(v.id('bands')),
  })
    .index('by_creator', ['createdBy'])
    .index('by_band', ['bandId'])
    .index('by_creator_key', ['createdBy', 'bandId', 'key'])
    .index('by_band_key', ['bandId', 'key'])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['createdBy', 'bandId'],
    }),

  versions: defineTable({
    songId: v.id('songs'),
    name: v.string(),
    artist: v.optional(v.string()),
    concertKey: v.string(),
    timeSignature: v.string(),
    bpm: v.optional(v.number()),
    tuning: v.array(v.string()),
    suggestedCapo: v.number(),
    timeline: v.array(
      v.object({
        entryId: v.string(),
        sectionId: v.id('sections'),
        repeat: v.optional(v.number()),
      }),
    ),
    tracks: v.optional(v.array(v.object({ id: v.string(), name: v.string() }))),
    parentVersionId: v.optional(v.id('versions')),
    bandId: v.optional(v.id('bands')),
    createdBy: v.string(),
    shareToken: v.optional(v.string()),
  })
    .index('by_song', ['songId'])
    .index('by_share', ['shareToken'])
    .index('by_creator', ['createdBy'])
    .index('by_parent_creator', ['parentVersionId', 'createdBy']),

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
    trackId: v.optional(v.string()),
    chartBody: v.optional(v.string()),
    strumming: v.optional(v.string()),
    measures: v.optional(v.array(storedTabMeasure)),
    rhythmGuessed: v.optional(v.boolean()),
    order: v.number(),
  })
    .index('by_section', ['sectionId'])
    .index('by_version', ['versionId']),

  chordShapes: defineTable({
    versionId: v.id('versions'),
    symbol: v.string(),
    shift: v.optional(v.number()),
    frets: v.array(v.number()),
    fingers: v.optional(v.array(v.number())),
  }).index('by_version', ['versionId']),

  userChordShapes: defineTable({
    userId: v.string(),
    tuning: v.string(),
    symbol: v.string(),
    frets: v.array(v.number()),
    fingers: v.optional(v.array(v.number())),
  }).index('by_user_tuning_symbol', ['userId', 'tuning', 'symbol']),

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
    name: v.optional(v.string()),
    capo: v.number(),
    following: v.boolean(),
    visibleTrackIds: v.optional(v.array(v.string())),
    // Old per-part filter, kept readable until migrations:jamTracks has run on every deployment.
    visiblePartIds: v.optional(v.array(v.string())),
    personalVersionId: v.optional(v.id('versions')),
  })
    .index('by_room', ['roomId'])
    .index('by_room_user', ['roomId', 'userId'])
    .index('by_user', ['userId']),

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
    parser: v.optional(v.literal('text')),
    output: v.optional(storedImportOutput),
    mapping: v.array(v.union(v.string(), v.null())),
    warnings: v.array(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),
})
