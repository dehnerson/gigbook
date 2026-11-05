import { CheckIcon, EyeIcon, PencilIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Crumb } from '@/components/app/page-header'
import { SaveIndicator, useSaver } from '@/components/app/save'
import { Segmented } from '@/components/app/segmented'
import { DetailsPanel } from '@/components/editor/details-panel'
import { Outline } from '@/components/editor/outline'
import { SectionPanel } from '@/components/editor/section-panel'
import type { EditorEntry, EditorVersion } from '@/components/editor/types'
import {
  EditorContext,
  useEditorMutations,
} from '@/components/editor/use-editor'
import { SongSheet } from '@/components/sheet/song-sheet'
import type { ChordShapeOverride } from '@/components/sheet/types'
import { ButtonLink } from '@/components/ui/button'
import { chartChords } from '@/lib/music/chordpro'
import { m } from '@/paraglide/messages'
import { useNotation } from './use-notation'

export function VersionEditor({
  version,
  song,
  timeline,
  shapes,
}: {
  version: EditorVersion
  song: { _id: string; title: string; artist: string }
  timeline: Array<EditorEntry>
  shapes: Array<ChordShapeOverride>
}) {
  const notation = useNotation()
  const mutations = useEditorMutations()
  const saver = useSaver()
  const [selected, setSelected] = useState<string>(
    timeline[0]?.entryId ?? 'details',
  )
  const [pendingSection, setPendingSection] = useState<string | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    if (pendingSection) {
      const created = timeline
        .filter((entry) => entry.sectionId === pendingSection)
        .at(-1)
      if (created) {
        setSelected(created.entryId)
        setPendingSection(null)
      }
      return
    }
    if (
      selected !== 'details' &&
      !timeline.some((entry) => entry.entryId === selected)
    )
      setSelected(timeline[0]?.entryId ?? 'details')
  }, [timeline, selected, pendingSection])

  const palette = [
    ...new Set(
      timeline.flatMap((entry) =>
        entry.parts.flatMap((part) =>
          part.kind === 'chart' && part.chartBody
            ? chartChords(part.chartBody)
            : [],
        ),
      ),
    ),
  ]
  const entry = timeline.find((item) => item.entryId === selected)

  return (
    <EditorContext.Provider value={{ mutations, save: saver.run }}>
      <div className="space-y-6">
        <nav className="flex min-w-0 items-center gap-1.5 text-sm">
          <Crumb to="/">{m.library()}</Crumb>
          <span className="text-muted-foreground/50">/</span>
          <Crumb to="/songs/$songId" params={{ songId: song._id }}>
            {song.title}
          </Crumb>
          <span className="text-muted-foreground/50">/</span>
          <Crumb to="/versions/$versionId" params={{ versionId: version._id }}>
            {version.name}
          </Crumb>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {song.title}
            </h1>
            <p className="text-muted-foreground">
              {m.editingVersion({ name: version.name })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveIndicator state={saver.state} />
            <Segmented
              aria-label={m.view()}
              value={view}
              onChange={setView}
              options={[
                { id: 'edit', label: m.edit(), icon: PencilIcon },
                { id: 'preview', label: m.preview(), icon: EyeIcon },
              ]}
            />
            <ButtonLink
              to="/versions/$versionId"
              params={{ versionId: version._id }}
            >
              <CheckIcon />
              {m.done()}
            </ButtonLink>
          </div>
        </div>

        {view === 'preview' ? (
          <div className="rounded-3xl border bg-card p-6 sm:p-10 [--sheet-bg:var(--card)]">
            <SongSheet
              version={version}
              song={song}
              timeline={timeline}
              shapes={shapes}
              settings={{
                capo: version.suggestedCapo,
                transpose: 0,
                notation,
                mode: 'both',
                scale: 1,
              }}
            />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6">
              <Outline
                timeline={timeline}
                selected={selected}
                onSelect={setSelected}
                onReorder={(entryIds) =>
                  void saver.run(() =>
                    mutations.reorderTimeline({
                      versionId: version._id,
                      entryIds,
                    }),
                  )
                }
                onAdd={(name) =>
                  void saver.run(async () => {
                    const sectionId = await mutations.addSection({
                      versionId: version._id,
                      name,
                    })
                    setPendingSection(sectionId)
                  })
                }
              />
            </aside>
            <section className="min-w-0">
              {entry ? (
                <SectionPanel
                  key={entry.entryId}
                  entry={entry}
                  timeline={timeline}
                  version={version}
                  palette={palette}
                  notation={notation}
                  onSelect={setSelected}
                />
              ) : (
                <DetailsPanel
                  key={version._id}
                  version={version}
                  notation={notation}
                />
              )}
            </section>
          </div>
        )}
      </div>
    </EditorContext.Provider>
  )
}
