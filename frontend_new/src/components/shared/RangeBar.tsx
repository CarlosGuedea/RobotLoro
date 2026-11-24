import { cn } from '@/lib/utils'
import type { Criterion, VariableStatus } from '@/types/domain'

interface RangeBarProps {
  criterion: Criterion
  value?: number
  status?: VariableStatus
  className?: string
}

const MARKER: Record<VariableStatus, string> = {
  en_rango: 'bg-success',
  fuera_de_rango: 'bg-warning',
}

/** Barra con el rango de entrenamiento del modelo y (opcional) el valor medido. */
export function RangeBar({ criterion, value, status, className }: RangeBarProps) {
  const [min, max] = criterion.scale
  const pct = (n: number) => `${Math.min(100, Math.max(0, ((n - min) / (max - min)) * 100))}%`
  const [from, to] = criterion.reference

  return (
    <div className={cn('relative h-2.5 rounded-full bg-muted', className)}>
      <div
        className="absolute inset-y-0 rounded-full bg-loro-400/60"
        style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-loro-700/70"
        style={{ left: pct(criterion.trainingMean) }}
      />
      {value !== undefined && (
        <div
          className={cn(
            'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-3 ring-card',
            status ? MARKER[status] : 'bg-foreground',
          )}
          style={{ left: pct(value) }}
        />
      )}
    </div>
  )
}
