import { CheckIcon, EyeIcon, PencilIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Crumb,
  HeaderButtonLink,
  PageHeader,
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
import { SongSheet, versionHeading } from '@/components/sheet/song-sheet'
import type { ChordShapeOverride } from '@/components/sheet/types'
import { chartChords } from '@/lib/music/chordpro'
import { DEFAULT_LAYERS } from '@/lib/sheet-layers'
import { songCrumbs } from '@/components/app/song-crumbs'
import type { Workspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'
import { useNotation } from '@/lib/use-notation'

export function VersionEditor({
  version,
  song,
  timeline,
  shapes,
  versionCount,
  mark,
  workspace,
}: {
  version: EditorVersion
  song: { _id: string; title: string; subTitle?: string }
  timeline: Array<EditorEntry>
  shapes: Array<ChordShapeOverride>
  versionCount: number
  mark?: ReactNode
  workspace?: Workspace
}) {
  const notation = useNotation()

  const versionLinkOptions = {
    to: workspace ? '/$workspace/versions/$versionId' : '/versions/$versionId',
    params: workspace
      ? { workspace: workspace.key, versionId: version._id }
      : { versionId: version._id },
  }

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
      <div>
        <PageHeader
          breadcrumbs={[
            ...songCrumbs({
              workspace,
              songId: song._id,
              title: song.title,
            }),
            <Crumb key="version" {...versionLinkOptions}>
              {version.name}
            </Crumb>,
          ]}
          {...versionHeading({
            song,
            version,
            showStats: false,
            mark,
          })}
          actions={
            <>
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
              <HeaderButtonLink {...versionLinkOptions}>
                <CheckIcon />
                {m.done()}
              </HeaderButtonLink>
            </>
          }
        />

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
