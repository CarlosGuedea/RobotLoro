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
  /** undefined = cargando; null = el sensor no da este valor. */
  value?: number | null
  icon: LucideIcon
  /** Texto en lugar del número cuando `value` es null. */
  unavailable?: string
  hint?: string
}

export function LiveReadingCard({
  criterion,
  value,
  icon: Icon,
  unavailable = 'Sin lectura',
  hint,
}: LiveReadingCardProps) {
  const number = value ?? undefined
  const status = number === undefined ? undefined : getVariableStatus(criterion, number)

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
      ) : value === null ? (
        <p className="mt-2 text-xl font-bold tracking-tight text-muted-foreground">{unavailable}</p>
      ) : (
        <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
          {formatNumber(value)}
          <span className="ml-1 text-base font-semibold text-muted-foreground">
            {criterion.unit}
          </span>
        </p>
      )}
      <RangeBar criterion={criterion} value={number} status={status} className="mt-4" />
      <p className="mt-2 text-xs text-muted-foreground">
        {hint ??
          `Entrenado con ${criterion.reference[0]} a ${criterion.reference[1]} ${criterion.unit}`}
      </p>
    </Card>
  )
}
