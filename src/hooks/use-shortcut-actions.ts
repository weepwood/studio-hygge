import { useEffect, useRef } from 'react'
import { shortcutActions } from '@/lib/shortcut-actions'

interface Actions {
  randomize?: () => void
  reset?: () => void
  undo?: () => void
  redo?: () => void
  download?: () => void
  exportPng?: () => void
  exportSvg?: () => void
  toggleRecording?: () => void
}

export function useShortcutActions(actions: Actions) {
  const ref = useRef(actions)
  ref.current = actions

  useEffect(() => {
    shortcutActions.randomize = () => ref.current.randomize?.()
    shortcutActions.reset = () => ref.current.reset?.()
    shortcutActions.undo = () => ref.current.undo?.()
    shortcutActions.redo = () => ref.current.redo?.()
    shortcutActions.download = () => ref.current.download?.()
    shortcutActions.exportPng = () => ref.current.exportPng?.()
    shortcutActions.exportSvg = () => ref.current.exportSvg?.()
    shortcutActions.toggleRecording = () => ref.current.toggleRecording?.()
    return () => {
      shortcutActions.randomize = null
      shortcutActions.reset = null
      shortcutActions.undo = null
      shortcutActions.redo = null
      shortcutActions.download = null
      shortcutActions.exportPng = null
      shortcutActions.exportSvg = null
      shortcutActions.toggleRecording = null
    }
  }, [])
}
