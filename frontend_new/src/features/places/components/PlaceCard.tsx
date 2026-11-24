import { Camera, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { VerdictBadge } from '@/components/shared/VerdictBadge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CRITERIA_BY_KEY } from '@/config/criteria'
import { getVariableStatus } from '@/lib/criteria'
import { formatNumber, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/domain'

export function PlaceCard({ place }: { place: Place }) {
  const last = place.lastEvaluation

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{place.name}</h3>
          {last.notes && (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" /> {last.notes}
            </p>
          )}
        </div>
        <VerdictBadge verdict={last.verdict} />
      </div>

      <div className="mt-4 mb-5 flex flex-wrap gap-x-3 gap-y-1.5">
        {last.variables.map((v) => {
          const criterion = CRITERIA_BY_KEY[v.key]
          const typical = getVariableStatus(criterion, v.value) === 'en_rango'
          return (
            <span key={v.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', typical ? 'bg-success' : 'bg-warning')} />
              {criterion.label}{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(v.value)} {criterion.unit}
              </span>
            </span>
          )
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Última: {formatRelative(last.createdAt)} · {place.evaluationsCount}{' '}
          {place.evaluationsCount === 1 ? 'evaluación' : 'evaluaciones'}
        </p>
        <Link
          to={`/evaluar?lugar=${encodeURIComponent(place.name)}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <Camera /> Reevaluar
        </Link>
      </div>
    </Card>
  )
}
