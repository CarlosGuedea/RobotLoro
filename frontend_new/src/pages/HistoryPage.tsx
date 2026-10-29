import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { VerdictBadge } from '@/components/shared/VerdictBadge'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CRITERIA } from '@/config/criteria'
import { useEvaluations } from '@/features/evaluations/hooks/useEvaluations'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VariableStatus } from '@/types/domain'

const VALUE_TONE: Record<VariableStatus, string> = {
  optimo: '',
  aceptable: 'text-warning',
  fuera_de_rango: 'text-destructive font-semibold',
}

export function HistoryPage() {
  const [placeId, setPlaceId] = useState('')
  const places = usePlaces()
  const { data, isPending } = useEvaluations(placeId || undefined)

  return (
    <>
      <PageHeader
        title="Historial"
        description="Todas las evaluaciones realizadas por el StudyBot."
        actions={
          <Select
            aria-label="Filtrar por lugar"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="w-64"
          >
            <option value="">Todos los lugares</option>
            {places.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        {isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="Sin evaluaciones"
            description="Este lugar todavía no se ha evaluado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Confianza</TableHead>
                {CRITERIA.map((c) => (
                  <TableHead key={c.key} className="text-right">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="font-medium">{e.placeName}</p>
                    {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  </TableCell>
                  <TableCell>
                    <VerdictBadge verdict={e.verdict} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(e.confidence)}
                  </TableCell>
                  {CRITERIA.map((c) => {
                    const v = e.variables.find((x) => x.key === c.key)
                    return (
                      <TableCell
                        key={c.key}
                        className={cn(
                          'text-right whitespace-nowrap tabular-nums',
                          v && VALUE_TONE[v.status],
                        )}
                      >
                        {v ? `${formatNumber(v.value)} ${c.unit}` : '—'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
