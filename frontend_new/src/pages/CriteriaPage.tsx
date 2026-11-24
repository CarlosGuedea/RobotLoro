import { Camera, Info } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CLIP_MODEL, IMAGE_DESCRIPTIONS } from '@/config/criteria'
import { CriterionCard } from '@/features/criteria/components/CriterionCard'
import { useCriteria } from '@/features/criteria/hooks/useCriteria'

export function CriteriaPage() {
  const { data, isPending } = useCriteria()

  return (
    <>
      <PageHeader
        title="Criterios"
        description="Qué recibe el modelo LorBot y cómo decide si un lugar es apto para trabajar."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cómo decide el modelo</CardTitle>
          <CardDescription>
            LorBot compara la foto con {IMAGE_DESCRIPTIONS.length} descripciones usando CLIP (
            <span className="font-mono">{CLIP_MODEL}</span>). Esas {IMAGE_DESCRIPTIONS.length}{' '}
            similitudes, junto con la temperatura y el ruido, entran a un clasificador SVM que
            responde <strong>Apto</strong> o <strong>No apto</strong>. No hay pesos fijos por
            variable: el clasificador las combina.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-loro-400/60" /> Rango de los datos de
          entrenamiento (media ± 2 desviaciones)
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="size-3.5" /> Fuera de él el modelo es menos confiable
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isPending
          ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-48" />)
          : data?.map((c) => <CriterionCard key={c.key} criterion={c} />)}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-4 text-primary" /> Lo que busca en la foto
          </CardTitle>
          <CardDescription>
            Descripciones con las que CLIP compara cada foto (traducidas del inglés).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid list-decimal gap-x-8 gap-y-1.5 pl-5 text-sm marker:text-muted-foreground md:grid-cols-2">
            {IMAGE_DESCRIPTIONS.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  )
}
