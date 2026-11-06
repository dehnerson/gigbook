import { useMutation } from 'convex/react'
import { createContext, useContext } from 'react'
import { api } from '../../../convex/_generated/api'
import type { useSaver } from '@/components/app/save'

export function useEditorMutations() {
  return {
    updateMeta: useMutation(api.versions.updateMeta),
    addSection: useMutation(api.versions.addSection),
    repeatSection: useMutation(api.versions.repeatSection),
    setRepeat: useMutation(api.versions.setRepeat),
    detachEntry: useMutation(api.versions.detachEntry),
    reorderTimeline: useMutation(api.versions.reorderTimeline),
    updateSection: useMutation(api.versions.updateSection),
    removeEntry: useMutation(api.versions.removeEntry),
    addPart: useMutation(api.versions.addPart),
    updatePart: useMutation(api.versions.updatePart),
    removePart: useMutation(api.versions.removePart),
    removeVersion: useMutation(api.versions.remove),
  }
}

export type EditorContextValue = {
  mutations: ReturnType<typeof useEditorMutations>
  save: ReturnType<typeof useSaver>['run']
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor() {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor must be used inside the editor')
  return value
}
