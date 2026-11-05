import { cn } from 'cn'
import { ChevronsDownIcon, PauseIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { m } from '@/paraglide/messages'
import { scrollToEntry } from './sheet/song-sheet'

export function useForceDark() {
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    const hadLight = root.classList.contains('light')
    root.classList.add('dark')
    root.classList.remove('light')
    return () => {
      if (!hadDark) root.classList.remove('dark')
      if (hadLight) root.classList.add('light')
    }
  }, [])
}

export function useAutoscroll(
  running: boolean,
  speed: number,
  onEnd: () => void,
) {
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = performance.now()
    let carry = 0
    const tick = (now: number) => {
      carry += (speed * 9 * (now - last)) / 1000
      last = now
      const step = Math.floor(carry)
      if (step > 0) {
        carry -= step
        window.scrollBy(0, step)
        const bottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2
        if (bottom) {
          end.current()
          return
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, speed])
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function useSectionKeys(
  entryIds: Array<string>,
  active: string | null,
  onMove?: (entryId: string, index: number) => void,
) {
  const state = useRef({ entryIds, active, onMove })
  state.current = { entryIds, active, onMove }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey) return
      const forward =
        event.key === 'PageDown' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        (event.key === ' ' && !event.shiftKey)
      const backward =
        event.key === 'PageUp' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowUp' ||
        (event.key === ' ' && event.shiftKey)
      if (!forward && !backward) return
      const { entryIds: ids, active: current, onMove: move } = state.current
      if (ids.length === 0) return
      event.preventDefault()
      const index = Math.max(0, current ? ids.indexOf(current) : 0)
      const next = Math.min(
        ids.length - 1,
        Math.max(0, index + (forward ? 1 : -1)),
      )
      const target = ids[next]
      if (!target) return
      scrollToEntry(target)
      move?.(target, next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function AutoscrollControl({
  running,
  onRunning,
  speed,
  onSpeed,
}: {
  running: boolean
  onRunning: (running: boolean) => void
  speed: number
  onSpeed: (speed: number) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card/60 p-1 pr-3">
      <Button
        variant={running ? 'default' : 'ghost'}
        size="icon-sm"
        aria-label={m.autoscroll()}
        aria-pressed={running}
        onPress={() => onRunning(!running)}
      >
        {running ? <PauseIcon /> : <ChevronsDownIcon />}
      </Button>
      <Slider
        aria-label={m.scrollSpeed()}
        minValue={1}
        maxValue={10}
        value={speed}
        onChange={(value) =>
          onSpeed(Array.isArray(value) ? (value[0] ?? 1) : value)
        }
        className="w-20 sm:w-24"
      />
    </div>
  )
}

export function StageDock({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          'scrollbar-none pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border bg-popover/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function DockDivider() {
  return <div className="h-8 w-px shrink-0 bg-border" />
}

export function useAutoscrollState() {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(3)
  useAutoscroll(running, speed, () => setRunning(false))
  return { running, setRunning, speed, setSpeed }
}
