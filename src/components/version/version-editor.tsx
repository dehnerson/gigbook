import { CheckIcon, EyeIcon, PencilIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Breadcrumbs,
  Crumb,
  HeaderActions,
  HeaderButtonLink,
} from '@/components/app/page-header'
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
import { SheetHeader, SongSheet } from '@/components/sheet/song-sheet'
import type { ChordShapeOverride } from '@/components/sheet/types'
import { chartChords } from '@/lib/music/chordpro'
import { DEFAULT_LAYERS } from '@/lib/sheet-layers'
import { songCrumbs } from '@/components/app/song-crumbs'
import { href } from '@/lib/space'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'
import { useNotation } from '@/lib/use-notation'

export function VersionEditor({
  version,
  song,
  timeline,
  shapes,
  versionCount,
  mark,
}: {
  version: EditorVersion
  song: { _id: string; title: string; subTitle?: string }
  timeline: Array<EditorEntry>
  shapes: Array<ChordShapeOverride>
  versionCount: number
  mark?: ReactNode
}) {
  const notation = useNotation()
  const { current, inWorkspace } = useWorkspace()
  const at = inWorkspace ? current.key : null
  const readHref = (versionId: string) =>
    href(at, { page: 'version', versionId })
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
        entry.section.chartBody ? chartChords(entry.section.chartBody) : [],
      ),
    ),
  ]
  const entry = timeline.find((item) => item.entryId === selected)

  return (
    <EditorContext.Provider value={{ mutations, save: saver.run }}>
      <div className="space-y-6">
        <div className="space-y-3">
          <Breadcrumbs>
            {songCrumbs({
              at,
              songId: song._id,
              title: song.title,
            })}
            <Crumb {...readHref(version._id)}>{version.name}</Crumb>
          </Breadcrumbs>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <SheetHeader
              song={song}
              version={version}
              showStats={false}
              mark={mark}
              className="min-w-0 md:flex-1"
            />
            <HeaderActions>
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
              <HeaderButtonLink {...readHref(version._id)}>
                <CheckIcon />
                {m.done()}
              </HeaderButtonLink>
            </HeaderActions>
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
                layers: DEFAULT_LAYERS,
                scale: 1,
              }}
              versionId={version._id}
              canEdit
              showHeader={false}
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
                  shapes={shapes}
                  onSelect={setSelected}
                />
              ) : (
                <DetailsPanel
                  key={version._id}
                  version={version}
                  timeline={timeline}
                  notation={notation}
                  songTitle={song.title}
                  isOnlyVersion={versionCount <= 1}
                />
              )}
            </section>
          </div>
        )}
      </div>
    </EditorContext.Provider>
  )
}
