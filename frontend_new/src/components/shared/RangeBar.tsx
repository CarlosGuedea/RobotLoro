import { cn } from '@/lib/utils'
import type { Criterion, VariableStatus } from '@/types/domain'

interface RangeBarProps {
  criterion: Criterion
  value?: number
  status?: VariableStatus
  className?: string
}

const MARKER: Record<VariableStatus, string> = {
  optimo: 'bg-success',
  aceptable: 'bg-warning',
  fuera_de_rango: 'bg-destructive',
}

/** Barra con la zona aceptable, la zona ideal y (opcional) el valor medido. */
export function RangeBar({ criterion, value, status, className }: RangeBarProps) {
  const [min, max] = criterion.scale
  const pct = (n: number) => `${Math.min(100, Math.max(0, ((n - min) / (max - min)) * 100))}%`
  const span = (a: number, b: number) => ({ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` })

  return (
    <div className={cn('relative h-2.5 rounded-full bg-muted', className)}>
      <div
        className="absolute inset-y-0 rounded-full bg-pico-300/50"
        style={span(...criterion.acceptable)}
      />
      <div
        className="absolute inset-y-0 rounded-full bg-loro-400/70"
        style={span(...criterion.ideal)}
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
