import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PlaceCard } from '@/features/places/components/PlaceCard'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/domain'

const FILTERS = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'apto', label: 'Aptos', test: (p: Place) => p.lastEvaluation.verdict === 'apto' },
  { id: 'no_apto', label: 'No aptos', test: (p: Place) => p.lastEvaluation.verdict === 'no_apto' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export function PlacesPage() {
  const { data, isPending } = usePlaces()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('todos')

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)!.test
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(
      (p) => test(p) && `${p.name} ${p.lastEvaluation.notes ?? ''}`.toLowerCase().includes(q),
    )
  }, [data, filter, query])

  return (
    <>
      <PageHeader
        title="Lugares probados"
        description="Se agregan solos cada vez que evalúas un lugar nuevo."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar lugar o referencia…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div
          className="flex gap-1 rounded-lg bg-muted p-1"
          role="tablist"
          aria-label="Filtrar por resultado"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'bg-card shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            mood={data?.length ? 'sad' : 'idle'}
            title={data?.length ? 'Sin resultados' : 'Aún no has probado ningún lugar'}
            description={
              data?.length
                ? 'Prueba con otro filtro o búsqueda.'
                : 'Ve a “Evaluar lugar” y prueba el primero.'
            }
          />
        </Card>
      )}
    </>
  )
}
