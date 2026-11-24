import { CRITERIA } from '@/config/criteria'
import { env } from '@/config/env'
import type { Evaluation, Place } from '@/types/domain'
import type { StudyBotApi } from './contract'
import { http } from './http'

/** El backend devuelve rutas relativas de foto; se resuelven contra la URL del backend. */
const withPhoto = (e: Evaluation): Evaluation => ({
  ...e,
  photoUrl: e.photoUrl && new URL(e.photoUrl, env.apiUrl).href,
})

/** Endpoints de RobotLoro/backend/server.py (documentados en el README). */
export const httpStudyBotApi: StudyBotApi = {
  getDeviceStatus: () => http('/api/device/status'),
  getLatestReading: () => http('/api/sensors/latest'),
  getReadingHistory: (limit = 30) => http('/api/sensors/history', { query: { limit } }),
  getPlaces: async () =>
    (await http<Place[]>('/api/places')).map((p) => ({
      ...p,
      lastEvaluation: withPhoto(p.lastEvaluation),
    })),
  getEvaluations: async (params) =>
    (await http<Evaluation[]>('/api/evaluations', { query: { placeId: params?.placeId } })).map(
      withPhoto,
    ),
  createEvaluation: async (input) =>
    withPhoto(await http<Evaluation>('/api/evaluations', { method: 'POST', body: input })),
  // Los rangos vienen del propio archivo del modelo; no cambian sin reentrenarlo.
  getCriteria: async () => CRITERIA,
  getSettings: () => http('/api/settings'),
  updateSettings: (settings) => http('/api/settings', { method: 'PUT', body: settings }),
  getNetwork: () => http('/api/network'),
}
