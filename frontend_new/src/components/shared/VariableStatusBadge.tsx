import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { VariableStatus } from '@/types/domain'

const MAP: Record<VariableStatus, { label: string; variant: BadgeProps['variant'] }> = {
  optimo: { label: 'Óptimo', variant: 'success' },
  aceptable: { label: 'Aceptable', variant: 'warning' },
  fuera_de_rango: { label: 'Fuera de rango', variant: 'destructive' },
}

export function VariableStatusBadge({ status }: { status: VariableStatus }) {
  const { label, variant } = MAP[status]
  return <Badge variant={variant}>{label}</Badge>
}
