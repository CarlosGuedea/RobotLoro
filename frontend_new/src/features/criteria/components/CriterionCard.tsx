import { Camera, Radio } from 'lucide-react'
import { RangeBar } from '@/components/shared/RangeBar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatPercent } from '@/lib/format'
import type { Criterion } from '@/types/domain'

export function CriterionCard({ criterion }: { criterion: Criterion }) {
  const { label, unit, source, description, weight, ideal, acceptable, scale } = criterion

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">
          {source === 'sensor' ? <Radio /> : <Camera />}
          {source === 'sensor' ? 'Sensor' : 'Cámara'}
        </Badge>
      </div>

      <RangeBar criterion={criterion} className="mt-5" />
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          {scale[0]} {unit}
        </span>
        <span>
          {scale[1]} {unit}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Ideal</dt>
          <dd className="font-semibold tabular-nums">
            {ideal[0]}–{ideal[1]} {unit}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aceptable</dt>
          <dd className="font-semibold tabular-nums">
            {acceptable[0]}–{acceptable[1]} {unit}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Peso</dt>
          <dd className="font-semibold tabular-nums">{formatPercent(weight)}</dd>
        </div>
      </dl>
    </Card>
  )
}
