import { useState } from 'react'
import { toast } from 'sonner'
import { m } from '@/paraglide/messages'
import { messageFor } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => Promise<unknown> | void
  destructive?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          {m.cancel()}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          isDisabled={busy}
          onPress={async () => {
            setBusy(true)
            try {
              await onConfirm()
              onOpenChange(false)
            } catch (error) {
              toast.error(messageFor(error))
            } finally {
              setBusy(false)
            }
          }}
        >
          {confirmLabel ?? m.delete()}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
