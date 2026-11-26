import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function initials(name: string, email: string | null) {
  const source = name.trim() || email?.split('@')[0] || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`
      : source.slice(0, 2)
  return letters.toUpperCase()
}

export function UserAvatar({
  name,
  email,
  imageUrl,
  size = 'default',
  className,
}: {
  name: string
  email: string | null
  imageUrl: string | null
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const broken = imageUrl !== null && brokenUrl === imageUrl
  const showImage = Boolean(imageUrl) && !broken
  return (
    <Avatar size={size} className={className}>
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt=""
          className="size-full rounded-full object-cover"
          onError={() => {
            if (imageUrl) setBrokenUrl(imageUrl)
          }}
        />
      ) : (
        <AvatarFallback>{initials(name, email)}</AvatarFallback>
      )}
    </Avatar>
  )
}
