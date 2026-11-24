import { CRITERIA } from '@/config/criteria'
import type { Evaluation, Place, SensorReading } from '@/types/domain'
import type { StudyBotApi } from '../api/contract'
import { ApiError } from '../api/http'
import { MOCK_EVALUATIONS } from './data'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const random = (min: number, max: number) => min + Math.random() * (max - min)
const round = (n: number) => Math.round(n * 10) / 10

const evaluations = [...MOCK_EVALUATIONS]
let settings = { cameraUrl: 'http://esp32cam.local', sensorsUrl: 'http://esp32sensores.local' }
const withHttp = (url: string) => (url.includes('://') ? url : `http://${url}`).replace(/\/+$/, '')

/** Mismo nombre (sin importar acentos/mayúsculas) = mismo lugar. */
const toPlaceId = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

function readingAt(date: Date): SensorReading {
  const t = date.getTime() / 60_000
  return {
    timestamp: date.toISOString(),
    temperatureC: round(29.5 + Math.sin(t / 9) * 1.6 + random(-0.3, 0.3)),
    humidityPct: round(55 + Math.sin(t / 15) * 6),
    soundDetected: Math.random() < 0.3,
    soundDbfs: round(-24 + Math.sin(t / 4) * 6 + random(-1, 1)),
    soundSource: 'inmp441',
    soundOk: true,
    soundClipped: false,
  }
}

/** Implementación simulada del backend para maquetar sin el ESP32. */
export const mockStudyBotApi: StudyBotApi = {
  async getDeviceStatus() {
    await delay(300)
    return {
      online: true,
      name: 'StudyBot Loro (simulado)',
      lastSeen: new Date(Date.now() - 2_000).toISOString(),
      components: [
        { key: 'camera', label: 'Cámara ESP32-CAM', health: 'ok', detail: 'Simulada' },
        { key: 'temperature', label: 'Sensor DHT22', health: 'ok', detail: 'Simulado' },
        {
          key: 'microphone',
          label: 'Sensor de sonido',
          health: 'ok',
          detail: 'INMP441 · −24 dBFS',
        },
        { key: 'model', label: 'Modelo LorBot', health: 'ok', detail: 'Simulado' },
      ],
    }
  },

  async getLatestReading() {
    await delay(150)
    return readingAt(new Date())
  },

  async getReadingHistory(limit = 30) {
    await delay(300)
    const now = Date.now()
    return Array.from({ length: limit }, (_, i) =>
      readingAt(new Date(now - (limit - 1 - i) * 60_000)),
    )
  },

  async getPlaces() {
    await delay(350)
    const places = new Map<string, Place>()
    for (const e of evaluations) {
      const place = places.get(e.placeId)
      if (place) place.evaluationsCount++
      else
        places.set(e.placeId, {
          id: e.placeId,
          name: e.placeName,
          lastEvaluation: e,
          evaluationsCount: 1,
        })
    }
    return [...places.values()]
  },

  async getEvaluations(params) {
    await delay(300)
    return params?.placeId ? evaluations.filter((e) => e.placeId === params.placeId) : evaluations
  },

  async createEvaluation({ placeName, notes, temperatureC, soundDbfs, soundSource, photo }) {
    // Lectura de sensores + foto (ESP32-CAM) + inferencia del modelo.
    await delay(2_500)
    const reading = readingAt(new Date())
    const noise = soundDbfs ?? reading.soundDbfs
    if (noise === null) throw new ApiError(422, 'Falta el ruido en dBFS.')
    const temperature = temperatureC ?? reading.temperatureC ?? 30
    // Regla aproximada SOLO para la maqueta; el veredicto real lo da el modelo LorBot.
    const verdict = temperature < 33 && noise < -22 ? 'apto' : 'no_apto'
    const evaluation: Evaluation = {
      id: `ev-${Date.now()}`,
      photoUrl:
        photo ?? (verdict === 'apto' ? '/mock/lugar-tranquilo.svg' : '/mock/lugar-concurrido.svg'),
      photoSource: photo ? 'subida' : 'camara',
      placeId: toPlaceId(placeName),
      placeName: placeName.trim(),
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      verdict,
      variables: [
        {
          key: 'temperatura',
          value: round(temperature),
          source: temperatureC === undefined ? 'sensor' : 'manual',
        },
        {
          key: 'ruido',
          value: round(noise),
          source: soundDbfs === undefined ? 'sensor' : (soundSource ?? 'manual'),
        },
      ],
    }
    evaluations.unshift(evaluation)
    return evaluation
  },

  async getSettings() {
    await delay(150)
    return settings
  },

  async updateSettings(next) {
    await delay(300)
    settings = {
      cameraUrl: withHttp(next.cameraUrl.trim()),
      sensorsUrl: withHttp(next.sensorsUrl.trim()),
    }
    return settings
  },

  async getCriteria() {
    await delay(200)
    return CRITERIA
  },
}
