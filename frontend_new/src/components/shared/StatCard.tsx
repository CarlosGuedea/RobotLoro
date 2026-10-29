import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value?: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: 'loro' | 'pico' | 'neutral'
  loading?: boolean
}

const TONES = {
  loro: 'bg-loro-100 text-loro-700 dark:bg-loro-900 dark:text-loro-300',
  pico: 'bg-pico-100 text-pico-700 dark:bg-pico-700/25 dark:text-pico-300',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'loro',
  loading,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('grid size-9 place-items-center rounded-md', TONES[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
