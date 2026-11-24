import type { Criterion, VariableStatus } from '@/types/domain'

/** Indica si el valor está dentro del rango típico de los datos de entrenamiento. */
export function getVariableStatus({ reference }: Criterion, value: number): VariableStatus {
  return value >= reference[0] && value <= reference[1] ? 'en_rango' : 'fuera_de_rango'
}
