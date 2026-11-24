import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { VariableStatus } from '@/types/domain'

const MAP: Record<
  VariableStatus,
  { label: string; variant: BadgeProps['variant']; title: string }
> = {
  en_rango: {
    label: 'Típico',
    variant: 'success',
    title: 'Dentro del rango de los datos con que se entrenó el modelo',
  },
  fuera_de_rango: {
    label: 'Atípico',
    variant: 'warning',
    title: 'Fuera del rango de entrenamiento: el modelo es menos confiable aquí',
  },
}

export function VariableStatusBadge({ status }: { status: VariableStatus }) {
  const { label, variant, title } = MAP[status]
  return (
    <Badge variant={variant} title={title}>
      {label}
    </Badge>
  )
}
