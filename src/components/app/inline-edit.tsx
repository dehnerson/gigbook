import { cn } from 'cn'
import { PencilIcon } from 'lucide-react'
import { useState } from 'react'

export function InlineEdit({
  value,
  onSave,
  label,
  isDisabled,
  className,
  inputClassName,
}: {
  value: string | undefined
  onSave: (value: string) => Promise<unknown> | void
  label: string
  isDisabled?: boolean
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (isDisabled) return <span className={className}>{value}</span>

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className={cn(
          'group -mx-1.5 inline-flex max-w-[calc(100%+0.75rem)] items-center gap-2 rounded-lg px-1.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <span className="truncate">{value}</span>
        <PencilIcon className="size-[0.55em] shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>
    )
  }

  const commit = () => {
    setEditing(false)
    const next = draft?.trim()
    if (next && next !== value) void onSave(next)
  }

  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') setEditing(false)
      }}
      className={cn(
        '-mx-1.5 w-full max-w-xl rounded-lg bg-muted/50 px-1.5 outline-none ring-2 ring-ring',
        className,
        inputClassName,
      )}
    />
  )
}
