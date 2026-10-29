import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { VerdictBadge } from '@/components/shared/VerdictBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format'
import { useEvaluations } from '../hooks/useEvaluations'

export function RecentEvaluations({ limit = 5 }: { limit?: number }) {
  const { data, isPending } = useEvaluations()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Últimas evaluaciones</CardTitle>
        <Link
          to="/historial"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Ver todo <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: limit }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="Aún no hay evaluaciones"
            description="Coloca al StudyBot en un lugar y evalúalo."
          />
        ) : (
          <ul className="divide-y">
            {data.slice(0, limit).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.placeName}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(e.createdAt)}</p>
                </div>
                <VerdictBadge verdict={e.verdict} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
