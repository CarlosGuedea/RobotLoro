import { Info } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CriterionCard } from '@/features/criteria/components/CriterionCard'
import { useCriteria } from '@/features/criteria/hooks/useCriteria'
import { formatPercent } from '@/lib/format'

const WEIGHT_COLORS = ['bg-loro-700', 'bg-loro-500', 'bg-pico-400', 'bg-loro-300', 'bg-pico-600']

export function CriteriaPage() {
  const { data, isPending } = useCriteria()

  return (
    <>
      <PageHeader
        title="Criterios"
        description="Variables que el modelo analiza para decidir si un lugar es apto para trabajar."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Peso de cada variable en el modelo</CardTitle>
          <CardDescription>
            Cuánto influye cada variable en el veredicto del modelo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full">
                {data?.map((c, i) => (
                  <div
                    key={c.key}
                    className={WEIGHT_COLORS[i % WEIGHT_COLORS.length]}
                    style={{ width: `${c.weight * 100}%` }}
                    title={`${c.label}: ${formatPercent(c.weight)}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {data?.map((c, i) => (
                  <span key={c.key} className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${WEIGHT_COLORS[i % WEIGHT_COLORS.length]}`}
                    />
                    {c.label}{' '}
                    <span className="text-muted-foreground tabular-nums">
                      {formatPercent(c.weight)}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-loro-400/70" /> Rango ideal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-pico-300/50" /> Rango aceptable
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="size-3.5" /> Fuera de ambos = fuera de rango
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-56" />)
          : data?.map((c) => <CriterionCard key={c.key} criterion={c} />)}
      </div>
    </>
  )
}
