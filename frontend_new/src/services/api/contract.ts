import type {
  CreateEvaluationInput,
  Criterion,
  DeviceStatus,
  Evaluation,
  Place,
  SensorReading,
} from '@/types/domain'

/**
 * Contrato entre el dashboard y el backend.
 * La implementación HTTP y la de mocks cumplen esta misma interfaz,
 * así que cambiar de una a otra no afecta a los componentes.
 */
export interface StudyBotApi {
  getDeviceStatus(): Promise<DeviceStatus>
  getLatestReading(): Promise<SensorReading>
  getReadingHistory(limit?: number): Promise<SensorReading[]>
  /** Lugares ya probados, agrupados a partir de las evaluaciones. */
  getPlaces(): Promise<Place[]>
  getEvaluations(params?: { placeId?: string }): Promise<Evaluation[]>
  /** Dispara la foto + lectura de sensores, corre el modelo y devuelve el veredicto. */
  createEvaluation(input: CreateEvaluationInput): Promise<Evaluation>
  getCriteria(): Promise<Criterion[]>
}
