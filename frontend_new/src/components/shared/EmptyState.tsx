import type { ReactNode } from 'react'
import { ParrotBot, type ParrotMood } from '@/components/brand/ParrotBot'

interface EmptyStateProps {
  title: string
  description?: string
  mood?: ParrotMood
  action?: ReactNode
}

export function EmptyState({ title, description, mood = 'idle', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <ParrotBot mood={mood} className="size-24" />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
