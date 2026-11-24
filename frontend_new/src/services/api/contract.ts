import type {
  CreateEvaluationInput,
  Criterion,
  DeviceSettings,
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
  /** Lee sensores, toma (o recibe) la foto, consulta al modelo LorBot y guarda el veredicto. */
  createEvaluation(input: CreateEvaluationInput): Promise<Evaluation>
  getCriteria(): Promise<Criterion[]>
  getSettings(): Promise<DeviceSettings>
  /** Acepta IP o nombre sin `http://`; el backend lo normaliza y lo guarda. */
  updateSettings(settings: DeviceSettings): Promise<DeviceSettings>
}
