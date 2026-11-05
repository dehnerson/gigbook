import { cn } from 'cn'
import { CircleAlertIcon, CloudCheckIcon, LoaderCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { messageFor } from '@/lib/errors'
import { m } from '@/paraglide/messages'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useSaver() {
  const [state, setState] = useState<SaveState>('idle')
  const pending = useRef(0)
  const run = useCallback(async (action: () => Promise<unknown>) => {
    pending.current += 1
    setState('saving')
    try {
      await action()
      pending.current -= 1
      if (pending.current === 0) setState('saved')
    } catch (error) {
      pending.current -= 1
      setState('error')
      toast.error(messageFor(error))
    }
  }, [])
  return { state, run }
}

export function useDebounced<T extends Array<unknown>>(
  callback: (...args: T) => void,
  delay = 700,
) {
  const latest = useRef(callback)
  latest.current = callback
  const timer = useRef<number | null>(null)
  const args = useRef<T | null>(null)

  const flush = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    if (args.current) {
      const current = args.current
      args.current = null
      latest.current(...current)
    }
  }, [])

  const call = useCallback(
    (...next: T) => {
      args.current = next
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, delay)
    },
    [delay, flush],
  )

  useEffect(() => flush, [flush])

  return { call, flush }
}

export function SaveIndicator({
  state,
  className,
}: {
  state: SaveState
  className?: string
}) {
  if (state === 'idle') return null
  return (
    <span
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground',
        state === 'error' && 'text-destructive',
        className,
      )}
    >
      {state === 'saving' ? (
        <>
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          {m.saving()}
        </>
      ) : state === 'saved' ? (
        <>
          <CloudCheckIcon className="size-3.5 text-success" />
          {m.saved()}
        </>
      ) : (
        <>
          <CircleAlertIcon className="size-3.5" />
          {m.saveFailed()}
        </>
      )}
    </span>
  )
}
