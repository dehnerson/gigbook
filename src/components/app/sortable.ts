import { useEffect, useState } from 'react'
import type * as React from 'react'

export function useSortable(
  ids: Array<string>,
  onReorder: (ids: Array<string>) => void,
) {
  const key = ids.join(',')
  const [order, setOrder] = useState(ids)
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    if (!dragging) setOrder(key ? key.split(',') : [])
  }, [key, dragging])

  const move = (id: string, direction: -1 | 1) => {
    const from = order.indexOf(id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= order.length) return
    const next = [...order]
    next.splice(from, 1)
    next.splice(to, 0, id)
    setOrder(next)
    onReorder(next)
  }

  const itemProps = (id: string) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = 'move'
      setDragging(id)
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault()
      if (!dragging || dragging === id) return
      setOrder((current) => {
        const next = [...current]
        const to = next.indexOf(id)
        next.splice(next.indexOf(dragging), 1)
        next.splice(to, 0, dragging)
        return next
      })
    },
    onDragEnd: () => {
      setDragging(null)
      if (order.join(',') !== key) onReorder(order)
    },
  })

  return { order, dragging, itemProps, move }
}
