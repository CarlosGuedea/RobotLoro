import type { StudyBotApi } from './contract'
import { http } from './http'

/** Endpoints propuestos para el backend (documentados en el README). */
export const httpStudyBotApi: StudyBotApi = {
  getDeviceStatus: () => http('/api/device/status'),
  getLatestReading: () => http('/api/sensors/latest'),
  getReadingHistory: (limit = 30) => http('/api/sensors/history', { query: { limit } }),
  getPlaces: () => http('/api/places'),
  getEvaluations: (params) => http('/api/evaluations', { query: { placeId: params?.placeId } }),
  createEvaluation: (input) => http('/api/evaluations', { method: 'POST', body: input }),
  getCriteria: () => http('/api/criteria'),
}
