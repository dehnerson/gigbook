# Gigbook roadmap: review feedback (Nov 2026)

This plan turns the 11 review remarks into phased work. Each item lists what the code does today, the proposed approach, and the concrete tasks. Decisions made along the way are collected at the end.

| #   | Topic                                  | Phase | Size |
| --- | -------------------------------------- | ----- | ---- |
| 1   | Clerk name sync                        | 1     | S    |
| 11  | Play mode on large screens             | 1     | S    |
| 10  | Duplicate songs and versions           | 1 + 3 | M    |
| 7   | Song import without hosting costs      | 2     | L    |
| 8   | Artist on song vs. version             | 3     | S    |
| 6   | Chord shapes (custom fingerings)       | 3     | M    |
| 4   | Repeats                                | 3 + 4 | M    |
| 2   | Tab data model, rhythm and note values | 0 + 4 | L    |
| 3   | Tab editing without typing dashes      | 4     | L    |
| 5   | Chords vs. tabs display mode           | 4     | M    |
| 9   | Parts filter                           | 4     | M    |

## Phase 0: Prototypes (decide before building)

### 0.1 Tab renderer: alphaTab vs. extended `TabStaff`

Build both against the same three test pieces: a riff with mixed note lengths, a passage with hammer-ons, pull-offs and bends, and a long solo that wraps across several lines.

- **Option A: alphaTab** (`@coderline/alphatab`). Renders standard notation and tab together with rhythm, plays audio with a moving cursor, and imports Guitar Pro (GP3–GP8) and MusicXML files. It's client-only, ships its own music font and soundfont, and has no editor, so we would generate alphaTex from our own model.
- **Option B: extend `src/components/sheet/tab-staff.tsx`.** Add rhythm stems and beams under the tab, space notes by their length, and optionally show note names (tuning plus fret gives the pitch). It stays light and matches the app's look, but has no standard notation or playback.

Evaluate:

- Readability of tab with rhythm, in dark play mode and at all text sizes.
- Bundle size and load time. alphaTab would be lazy-loaded only on sheets that contain tabs.
- Theming (chord color, sheet background, play mode).
- Line wrapping on phone vs. desktop widths.
- Hooks for capo and transpose (out-of-range notes are flagged today via `previewTabShift`).
- Fit with server rendering (TanStack Start). alphaTab must render client-side only.
- Whether playback and the moving cursor are worth the extra weight.

**Output:** a decision, plus the storage format for tabs used in 4.1. It is either our simplified JSON (see 4.1) or one alphaTex string per tab part.

**Status: decided, alphaTab** (see Decisions). Prototype: Open `/lab/tabs` (public route, no login). Code: `src/components/lab/`, `src/lib/music/tab-beats.ts`, `src/routes/lab/tabs.tsx`.

Findings:

- **Storage is settled either way: our JSON model.** Turning it into alphaTex is about 60 lines (`toAlphaTex`) and rendered all three pieces correctly on the first try. That keeps tabs readable to Convex queries, transposable with plain arithmetic, and editable by the grid editor, whichever renderer we pick.
- **alphaTab:** the engraving is correct out of the box (beaming, rests, dots, bends with "full"/"½", H/P arcs, slides, vibrato, repeat signs, 1st/2nd endings), standard notation is one toggle, and playback with a cursor works. It takes our theme through `display.resources` (colors read from the CSS variables, light and dark both work) and our fonts for tab numbers and chord names. It can't give chord names their own color, so they use the note color instead of `--chord`. Cost on the first tab view: 321 kB gzipped JS plus a 306 kB music font, and another 1.3 MB if the player loads its soundfont (this could wait until someone presses Play). It's split into its own chunk, so pages without tabs don't pay anything. First render takes about 150–230 ms.
- **Own renderer:** no extra download, renders instantly, and we have full control over the look (chord color, note-name row, highlighting in play mode). Every notation rule is hand-built, though, and the prototype already approximates rests and beaming. Triplets, ties, palm mute, let ring, slides across bar lines and two voices would each be more work, and there is no standard notation or audio.
- **Phone width:** both fit only one or two bars per line for busy passages. That's a layout question, not a renderer question.

### 0.2 Import without AI: feasibility check

Collect about 10 real sources: Ultimate Guitar copy-pastes, songbook text, ChordPro files, a Guitar Pro file and a MusicXML file. Measure how many convert cleanly with the deterministic parsers from 2.1, without any AI. Also try the Chrome on-device model (2.4) on two or three pasted songs to judge its quality.

**Output:** which import paths can skip AI entirely, and whether the on-device model is worth keeping.

**Status: text paths answered, on-device model still open.** Samples live in `src/lib/import/samples.ts` and are checked by `src/lib/import/import.test.ts`. They are public-domain songs written in ten common source layouts, not real copy-pastes yet. Real pastes should be added to the same file as they turn up.

- **9 of 10 convert cleanly without AI:** Ultimate Guitar copy-paste with a header block and a riff tab; Ultimate Guitar raw `[ch]`/`[tab]` markup; a German songbook with numbered verses, H notation and `Kapodaster`; a ChordPro file; plain chords over lyrics without any headers (verses and chorus named by structure); colon headers with chords on the header line; a tab block with chord names above; a bar grid with `[Chorus] x2`; chords in parentheses inline. Title, artist, capo, key, tuning, tempo, time signature and strumming come from metadata lines.
- **The tenth is lyrics only.** It imports as text and is flagged with "No chords were found". With a key, it goes to AI automatically.
- **Chord placement is exactly as good as the source's column alignment.** A chord typed two letters too far right lands mid-word, as it would on paper. AI doesn't fix this reliably either.
- **Not covered by the text parser:** photos and scanned PDFs, web pages (the server strips the HTML down to one line, which destroys the chord columns) and Guitar Pro/MusicXML (waits for 4.1).
- **On-device model:** Chromium 148 exposes `LanguageModel` (checked in Cursor's built-in browser), but the model was only `downloadable`, so no quality test yet. Downloading it takes several GB.

## Phase 1: Quick fixes

**Status: done.** One manual step left: create the webhook in the Clerk dashboard and set `CLERK_WEBHOOK_SECRET` in Convex (dev and prod). Until then the endpoint answers 500 and names still update through `users.ensure`.

### 1.1 Clerk name sync (#1)

**Today:** `users.ensure` runs once per page load (`src/components/ensure-user.tsx`) and copies the name from the login token, so a name change only appears after a full reload. The name is also copied into `memberships.name` (`convex/bands.ts`) and `jamMembers.name` (`convex/jam.ts`) when those rows are created, and those copies never update.

**Approach:**

- Add `convex/http.ts` with a `/clerk-users-webhook` route that verifies the Svix signature (`svix` package, `CLERK_WEBHOOK_SECRET` env var).
  - On `user.created` and `user.updated`, call an internal `users.upsertFromClerk`.
  - On `user.deleted`, call `users.deleteFromClerk`.
  - Name fallback order: first + last name, then username, then email.
- Set up the webhook endpoint in the Clerk dashboard (`https://<deployment>.convex.site/clerk-users-webhook`, user events).
- Keep `users.ensure` as a first-login fallback, since webhooks arrive with a delay.
- Remove `name` from `memberships` and `jamMembers`. Look names up from `users` (index `by_clerk`) in the band and jam queries instead.

**Account deletion:** nothing is kept as an orphan. Content that belongs to a band moves to the band; everything personal is deleted. `users.deleteFromClerk` schedules the cleanup in batches, because a large library can exceed the limits of a single mutation.

- **Bands the user owns:** hand ownership to the longest-standing editor, or the longest-standing viewer if there are no editors. If the user was the only member, delete the band together with its songs and setlists.
- **Band songs and versions** (`bandId` set) stay in the band. Set `createdBy` to the band's current owner, since `canReadSong` and `canEditSong` also check `createdBy`.
- **Band setlists** stay in the band, with `ownerId` set to the band's owner.
- **Personal songs** (no `bandId`) are deleted via `deleteVersionTree`, which also removes their entries in other people's setlists. Personal setlists are deleted too.
- **Everything else tied to the user** is deleted: memberships, jam rooms they host (including their members), jam memberships, import drafts with their uploaded files, AI credentials, personal chord shapes (3.3), and the `users` row.

### 1.2 Play mode cursor (#11)

**Today:** the active section comes from scroll position (`useActiveEntry` in `song-sheet.tsx`). On a screen tall enough to show everything, the last sections never reach the "active" line. Worse, `useSectionKeys` in `play-view.tsx` calculates "next" from that scroll-derived value. If the page can't scroll, PageDown or a foot pedal does nothing and stays stuck.

**Approach:**

- Add a `useSectionCursor(entryIds)` hook for play mode. The active index is explicit state.
  - Keys, pedal, tapping a section and the section nav move the cursor.
  - Scrolling follows the cursor, not the other way round.
  - Manual scrolling (wheel or touch) still updates the cursor, but programmatic scrolls are ignored.
- Add bottom padding about one screen tall (for example `pb-[60vh]`) so the last section can scroll to the top. Apply it to the read page too.
- Use the same cursor shape as jam mode, where `jamRooms.timelineIndex` is already explicit, so play and jam behave the same way.

### 1.3 Self-fork guard (first part of #10)

- On the share page, if the version is already yours, or you already forked it (a version with `parentVersionId` equal to it and `createdBy` equal to you), show "Open in library" instead of "Add to library".
- `versions.duplicate` repeats the same check on the server and returns the existing copy instead of creating a new one.

## Phase 2: Song import without hosting costs (#7)

**Today:** pasted text and ChordPro files are parsed on the client without AI (2.1, 2.3). Everything else goes through the AI SDK with the user's own encrypted key for Google, OpenAI or Anthropic (2.2). The Convex AI Gateway is not used.

**Constraint:** the app owner should not pay for imports yet. The Convex AI Gateway bills usage to the owner's Convex account and needs a paid plan, so it is postponed to 2.5.

**Strategy:** use free deterministic parsing wherever possible, and AI only where needed, paid for by the user's own key or a free tier.

### 2.1 Deterministic parsers (free, instant, no AI)

Run them on the client in `src/lib/import/`. They produce the same `importOutput` shape and go straight to the existing draft review screen with status `ready`.

**Status: text parsers done** (`parseSongText` in `src/lib/import/text.ts`, metadata in `meta.ts`). Guitar Pro and MusicXML are still open and wait for 4.1.

- **Chords over lyrics** (Ultimate Guitar style) to ChordPro. Much of this already exists in `chordpro.ts`: `chordsOverLyricsToChordPro`, `isChordLine`, `sectionLabelOf` and `hasChordsOverLyrics`, with tests. The work is mostly wiring it into the import flow.
- **Section headers** such as `[Verse 1]`, `Chorus:` and `INTRO`.
- **Metadata lines** such as `Capo 2`, `Key: G`, `Tuning: DADGAD` and `BPM 120`.
- **ASCII tabs** via the existing `parseAsciiTab`.
- **ChordPro files** (`.cho`, `.chopro`, `.pro`), passed through almost unchanged.
- **Guitar Pro and MusicXML files** via alphaTab's importer, which works without the renderer. Map tracks to parts, section markers to sections, beats with durations to tab beats, and include lyrics, chord names and repeats. This depends on the tab format chosen in 0.1 and 4.1.

### 2.2 Bring your own key, any provider (AI SDK)

**Status: done.** The model list lives in `src/lib/import/models.ts`, provider setup and error mapping in `convex/lib/ai.ts`. AI SDK 7 deprecates `generateObject`, so the action uses `generateText` with `Output.object({ schema: draftSchema })`. Deployments need `AI_KEY_ENCRYPTION_SECRET` set before anyone can save a key (set on dev).

- Switch to the AI SDK (`ai` package) and use `generateObject` with the existing Zod `draftSchema`. This removes the hand-written JSON and code-fence parsing.
- Providers: Google (`@ai-sdk/google`), OpenAI (`@ai-sdk/openai`) and Anthropic (`@ai-sdk/anthropic`).
- Widen `userAiCredentials.provider` to `'google' | 'openai' | 'anthropic'`. A user can store one key per provider; `users.aiModel` picks the model, and therefore the key, used for imports.
- Keep a curated model list in one shared file, with capability flags (`vision`, `pdf`). Check the chosen model against it on the server. In the UI, disable source types the model can't handle.
- Make `testKey` work for every provider.
- In settings, offer a provider select, key field and model select. Point out that Google is the free option: a Gemini key from Google AI Studio needs no billing account. Third-party measurements put the free tier at roughly 20 requests per day for Flash and 500 per day for Flash-Lite; AI Studio shows the real limits. OpenAI and Anthropic keys are paid per use.

### 2.3 Hybrid pipeline

- For pasted text, URLs and files, run the deterministic parser first. Only use AI when the parser's result looks weak (for example no sections or no chords found), or when the user chooses "Use AI".
- Photos and scanned PDFs always go to AI.
- This keeps most imports free and instant, even for users without a key.

**Status: done for pasted text and ChordPro/text files.**

- The import page reads the text as you type and shows what it recognized. The AI switch only appears for users with a key.
- `importDrafts.createParsed` stores the result as a `ready` draft (`parser: 'text'`) and maps sections onto the target version by name. These drafts don't count against the hourly AI limit.
- On the review page, "Try with AI" (`importDrafts.retryWithAi`) re-runs the same text through AI.
- Users without a key can import text. Photo, PDF, URL and YouTube sources show a key notice instead of blocking the whole page.
- Still open: URLs. The server would need to keep the `<pre>` layout of the page (or the chord site's embedded data) before the text parser can help.
- Fixed on the way: `importDrafts.save`, `create` and `createParsed` now check that the user may edit the target version, and `save` ignores mapped sections from other versions.

### 2.4 Experimental: on-device AI in Chrome

- The Chrome Prompt API (Gemini Nano) is stable in desktop Chrome 148. It accepts images and supports JSON Schema output (`responseConstraint`), and runs locally for free.
- Use it as a fallback when the user has no key: feature-detect `LanguageModel`, run on the client, and send the result to the draft.
- Keep it only if the quality check in 0.2 is acceptable.

### 2.5 Later: hosted AI via the Convex AI Gateway

Once the app has paying users, add the gateway as a hosted option. With the AI SDK in place this is a provider swap (`@convex-dev/ai-sdk-provider`, `convexGateway("provider/model")`), plus a rate limiter and probably a paid plan.

## Phase 3: Data model

Use the usual Convex migration path for schema changes: add optional fields, backfill them (for example with `@convex-dev/migrations`), then make them required if needed.

### 3.1 Artist per version (#8)

**Status: done.** `updateMeta` clears `versions.artist` when it's empty or equal to the song's artist. Library search also matches version artists.

- A song is the composition: title plus original artist. A version is an arrangement.
- Add an optional `versions.artist` ("performed by"). Display it as `version.artist ?? song.artist`.
  - A cover is a version whose artist differs from the song's.
  - Live, acoustic or band arrangements keep the artist and use the version name.
- Editor: add a "Performed by (if different)" field in the details panel. Label the song field "Original artist".
- Library: show the performing artist on version rows when it differs.
- Import into an existing song with a different artist sets `version.artist`.

### 3.2 Duplicate prevention (#10)

**Status: done.** `songKey()` lives in `src/lib/song-key.ts`, the scoped lookups in `convex/lib/songs.ts`. `songs.backfillKeys` filled in existing songs on dev; run it once on prod after deploying (`vpx convex run songs:backfillKeys --prod`). Songs without a key are invisible to the check until then. An unknown artist counts as empty, so "Wonderwall" by Unknown matches "Wonderwall" with no artist. Renaming a song into an existing key is still allowed.

Convex has no unique constraints. The recommended pattern is check-then-insert inside a mutation. Mutations are transactions, so this is race-free.

Each scope is checked separately: the personal library only against personal songs (no `bandId`), and each band only against its own songs. Having the same song personally and in a band is allowed.

- Add `songs.key`, a normalized form of `title|artist` (lowercase, accents and punctuation stripped, a leading "the" removed). Use a shared `songKey()` helper. Add indexes `by_creator_key` (personal songs) and `by_band_key`, and backfill existing songs.
- Add a search index on `songs.title`, filtered by the target scope. As the user types in the new-song dialog, show similar songs in that scope: "You already have X. Open it, or add a new version?"
- In `songs.create`, if the key already exists, return `{ existing: songId }` and let the UI ask the user.
- Forking: if the user already has a song with the same key, add the fork as a new version under that song instead of creating a second song. The guard from 1.3 still applies.
- Import save: run the same key check and offer "Add as new version of …".

### 3.3 Chord shapes (#6)

**Today:** `chordShapes` stores per-version custom fingerings (chord symbol to frets). The chord strip uses them only when capo and transpose are both 0. `versions.upsertShape` exists, but no UI calls it.

**Approach:** decide which fingering to show in this order:

1. **Version override**, the author's intent ("play this exact Cadd9 voicing"). It's stored in `chordShapes` and travels with sharing and forking.
2. **Personal library**, a viewer preference like capo or notation. New table `userChordShapes { userId, symbol, frets, fingers? }`, keyed by the shape as displayed after capo, so it applies to whatever you actually play.
3. **Built-in default**, from `lookupChordDiagram`.

Chord symbols remain the shared source of truth, so sharing and jam stay consistent. Only the diagrams differ between viewers.

- UI: tap a diagram in the chord strip to see alternative voicings, then choose "Use in this song" (editors only) or "Always use for me".
- Alternative voicings need data. Either generate them from tuning and chord tones, or bundle an open dataset (for example `chords-db`, MIT licence).

**Status: done.** Voicings are generated from the tuning and chord tones (`src/lib/music/voicings.ts`), so DADGAD, Drop D and Open G get real diagrams too; standard tuning still shows the hand-made shape first. `resolveChord` in `src/lib/music/shapes.ts` applies the order above. A version override also stores the capo/transpose offset (`shift`) it was chosen at, so it only shows when you play the same shapes; older overrides count as "as written". Customized diagrams get a small dot in the chord strip.

### 3.4 Repeat counts in the timeline (first part of #4)

**Today:** "Repeat" adds the same section to the timeline again, so the content is shared and linked.

**Idea:** the timeline is already the road map that D.S. and Coda markings encode on paper, so we don't need those symbols. What's missing is a repeat count.

**Status: done.** The ×N stepper sits in the section panel header next to "Reuse later", and the outline shows the count. Both layouts share one pass list (`src/lib/passes.ts`, ids like `entryId~2`), so the cursor, keys and the jam's `timelineIndex` count passes the same way whichever layout each player picks. The layout toggle only appears when a version has repeats.

- Add `timeline[].repeat?: number`, shown as "Chorus ×2".
- Editor: put a ×N stepper on each outline entry. Rename the current Repeat button to "Reuse section later", which is still useful for a chorus coming back after the bridge.
- Play mode:
  - Expanded by default: repeats are written out, each pass is its own block ("Chorus 1/2", "Chorus 2/2"), and the cursor, autoscroll and jam sync simply step through them.
  - A "compact" toggle shows each repeated entry once with a "×2" badge, like on paper. The cursor still counts passes there.

## Phase 4: Tabs, layers, tracks and repeats inside parts

This phase depends on the decision in 0.1.

### 4.1 Tab data model with note lengths (#2)

**Today:** `tabMeasure = { chordAbove?, events: [{ position, notes: [{ string, fret, technique?, bendSemitones? }] }] }`. `position` is always the array index, so it's redundant, and there is no duration.

**Proposal** (prototyped in `src/lib/music/tab-beats.ts`):

```ts
tabNote = { s: number, f: number, t?: 'h' | 'p' | 'b' | '/' | '\\' | '~', bend?: number }
tabBeat = { d: 1 | 2 | 4 | 8 | 16 | 32, dot?: true, rest?: true, chord?: string, notes: tabNote[] }
tabMeasure = { beats: tabBeat[], repeat?: { start?: true, times?: number }, ending?: number }
```

The chord name sits on the beat, not the measure, because chords often change mid-bar (the riff test piece needed G and D in one bar).

- Durations let us draw rhythm, space notes by length, and check that each bar adds up to the time signature.
- Note names come from tuning plus fret, so we can show them with no extra data. Rhythm plus tab is the default view. Note names are an optional layer (see 4.3), off by default, shown as a row of small names below the staff (stacked for chords) and respecting the German/English notation setting. If alphaTab wins in 0.1, its standard notation staff replaces the note-names layer.
- Migrate existing measures with each event becoming a beat, defaulting to eighth notes. Mark migrated parts so the editor can suggest checking the rhythm.
- Update `previewTabShift`, `saveWrittenKey`, the import schema and the AI prompt to the new shape.

**Status: done.** The model lives in `src/lib/music/tab.ts` (the prototype file `tab-beats.ts` is merged into it). Sheets render tabs with alphaTab (`src/components/sheet/tab-staff.tsx`), lazy-loaded, themed, with notes that can't move with the key drawn in red and a "Listen" button that loads the soundfont only when pressed.

- **Rhythm from ASCII tabs is guessed, not fixed at eighths.** `parseAsciiTab` reads note lengths from the column spacing: evenly spaced notes fill the bar (four in 4/4 become quarters), uneven spacing is split proportionally. `serializeAsciiTab` spaces notes by length so the round trip keeps them. The textarea editor keeps the stored lengths of every bar whose note count didn't change, so fixing a fret doesn't reset the rhythm.
- **`parts.rhythmGuessed`** marks tabs whose rhythm was guessed: migrated parts, ASCII imports, and edits that changed a bar's note count. The AI sets it when the source shows no rhythm. The grid editor (4.2) should show the hint and clear the flag.
- **Migration:** the schema accepts both shapes for now, reads convert old measures on the fly (`toTabMeasures`), and `migrations:tabBeats` rewrites parts and import drafts. Dev is migrated. For prod: deploy, run `npx convex run --prod migrations:tabBeats`, check that no part still has `events`, then remove `legacyTabMeasure` from `convex/schema.ts` and deploy again.

### 4.2 Grid tab editor (#3)

- The default editor is a grid of strings × beats with a cursor:
  - Type a fret number into the selected cell; arrow keys move.
  - Number keys set the length (for example 1 = whole … 5 = sixteenth), and `.` toggles a dot.
  - `h`, `p`, `b` and `/` add techniques.
  - "Insert chord" drops a full chord shape into one beat.
- Show a live preview below or inline, using the renderer chosen in 0.1.
- Keep the ASCII textarea as a "Paste tab" import (existing `parseAsciiTab`), not as the main editor.

### 4.3 Layers instead of the display mode buttons (#5)

**Today:** `DisplayModeToggle` always offers Both, Lyrics and Chords, even when a version only has tabs. Lyrics mode hides tabs, which is a side effect rather than a clear rule.

**Approach:**

- Replace the three buttons with layer toggles: Lyrics, Chords, Strumming and Tab, plus Note names (off by default) once 4.1 lands.
- Work out from the content which layers exist, and show toggles only for those.
- Save the selection per user and page, as `useSheetPrefs` does today.

### 4.4 Tracks instead of the parts filter (#9)

**Today:** `PartsFilter` lists every part of every section separately (section name plus part label). It's unclear what it's for, and it grows with every section. `song-sheet.tsx` also needs a `DEFAULT_LABELS` workaround to hide generic part labels.

**Approach:**

- Add tracks per version: `versions.tracks: [{ id, name, instrument? }]` and `parts.trackId`.
  - Defaults: "Vocals & chords" for chart parts, "Guitar tab" for tab parts.
  - Users can add tracks such as "Lead riff", "Rhythm guitar" or "Bass".
- The filter becomes "Show tracks: [x] Vocals & chords [x] Lead riff". It's short and has a clear purpose.
- Jam: `jamMembers.visiblePartIds` becomes `visibleTrackIds`, meaning each member picks the track they play.
- The part label becomes optional; the track name replaces it in most cases. Remove `DEFAULT_LABELS`.

### 4.5 Repeats inside parts (second part of #4)

- Add a part-level repeat count, for example "riff ×4" on a tab or bar-grid part.
- Tabs: add repeat barlines and 1st/2nd endings (`repeat` and `ending` in 4.1). alphaTab renders these natively if chosen.
- Bar grids in ChordPro: support `|: Em | G D :| x4`, rendered with repeat signs.

## Dependencies

- 0.1 decides 4.1, and 4.1 decides the Guitar Pro and MusicXML mapping in 2.1. The text parsers in 2.1 don't depend on it.
- 3.2 (song key) should land before the "add fork to existing song" behaviour.
- 4.3 and 4.4 change sheet controls shared by the read, play, share and jam pages. Do them together.

## Decisions

1. **Account deletion (1.1):** no orphans. Band content moves to the band (with ownership handed over), and personal content is deleted.
2. **Note names (4.1):** rhythm plus tab by default, note names as an optional layer. alphaTab's notation staff replaces that layer if alphaTab is chosen.
3. **Repeats in play mode (3.4):** expanded by default, with a compact toggle.
4. **Duplicate detection (3.2):** each scope separately (personal library, each band).
5. **AI providers (2.2):** Google, OpenAI and Anthropic. Google is the free option for users.
6. **Hosting costs (Phase 2):** the app owner pays nothing for AI for now. The Convex AI Gateway comes later (2.5).
7. **Tab renderer (0.1):** alphaTab, lazy-loaded only on sheets with tabs. Tabs are stored as our JSON model (4.1) and converted to alphaTex for rendering. The soundfont should load only when the user presses Play.
