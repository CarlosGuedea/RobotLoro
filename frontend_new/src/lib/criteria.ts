import type { Criterion, VariableStatus } from '@/types/domain'

/** Clasifica un valor según los rangos ideal/aceptable del criterio. */
export function getVariableStatus({ ideal, acceptable }: Criterion, value: number): VariableStatus {
  if (value >= ideal[0] && value <= ideal[1]) return 'optimo'
  if (value >= acceptable[0] && value <= acceptable[1]) return 'aceptable'
  return 'fuera_de_rango'
}
