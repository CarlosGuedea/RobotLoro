import type { LucideIcon } from 'lucide-react'
import { RangeBar } from '@/components/shared/RangeBar'
import { VariableStatusBadge } from '@/components/shared/VariableStatusBadge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getVariableStatus } from '@/lib/criteria'
import { formatNumber } from '@/lib/format'
import type { Criterion } from '@/types/domain'

interface LiveReadingCardProps {
  criterion: Criterion
  value?: number
  icon: LucideIcon
}

export function LiveReadingCard({ criterion, value, icon: Icon }: LiveReadingCardProps) {
  const status = value === undefined ? undefined : getVariableStatus(criterion, value)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" /> {criterion.label} en vivo
        </p>
        {status && <VariableStatusBadge status={status} />}
      </div>
      {value === undefined ? (
        <Skeleton className="mt-3 h-9 w-28" />
      ) : (
        <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
          {formatNumber(value)}
          <span className="ml-1 text-base font-semibold text-muted-foreground">
            {criterion.unit}
          </span>
        </p>
      )}
      <RangeBar criterion={criterion} value={value} status={status} className="mt-4" />
      <p className="mt-2 text-xs text-muted-foreground">
        Ideal {criterion.ideal[0]}–{criterion.ideal[1]} {criterion.unit}
      </p>
    </Card>
  )
}
