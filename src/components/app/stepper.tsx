import { cn } from 'cn'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Stepper({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  format = (current) => String(current),
  size = 'default',
  className,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  format?: (value: number) => string
  size?: 'default' | 'lg'
  className?: string
}) {
  const large = size === 'lg'
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border bg-card/60 p-1',
        className,
      )}
    >
      <Button
        variant="ghost"
        size={large ? 'icon-lg' : 'icon-sm'}
        aria-label={`${label} −`}
        isDisabled={value - step < min}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <MinusIcon />
      </Button>
      <div
        className={cn(
          'flex min-w-14 flex-col items-center px-1 leading-none',
          large && 'min-w-18',
        )}
      >
        <span className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            'mt-1 font-mono text-sm font-semibold tabular-nums',
            large && 'text-lg',
          )}
          aria-live="polite"
        >
          {format(value)}
        </span>
      </div>
      <Button
        variant="ghost"
        size={large ? 'icon-lg' : 'icon-sm'}
        aria-label={`${label} +`}
        isDisabled={value + step > max}
        onPress={() => onChange(Math.min(max, value + step))}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}
