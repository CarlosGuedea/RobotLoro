import { CircleCheck, CircleX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Evaluation } from '@/types/domain'
import { VariableBreakdown } from './VariableBreakdown'

export function EvaluationResult({ evaluation }: { evaluation: Evaluation }) {
  const apto = evaluation.verdict === 'apto'

  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'flex items-center gap-3 p-4',
          apto
            ? 'bg-gradient-to-r from-loro-600 to-loro-500 text-white'
            : 'bg-gradient-to-r from-destructive to-destructive/80 text-white',
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
          {apto ? <CircleCheck className="size-6" /> : <CircleX className="size-6" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium opacity-90">
            {evaluation.placeName}
            {evaluation.notes && <span className="opacity-75"> · {evaluation.notes}</span>}
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{apto ? '¡Apto!' : 'No apto'}</p>
          <p className="text-xs opacity-90">
            Según el modelo LorBot · foto{' '}
            {evaluation.photoSource === 'camara' ? 'del loro' : 'subida'}
          </p>
        </div>
      </div>
      <CardContent className="pt-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Evaluado el {formatDateTime(evaluation.createdAt)}
        </p>
        <VariableBreakdown variables={evaluation.variables} />
        <p className="mt-3 text-[11px] text-muted-foreground">
          La barra verde es el rango de los datos de entrenamiento; fuera de él el veredicto es
          menos confiable.
        </p>
      </CardContent>
    </Card>
  )
}
