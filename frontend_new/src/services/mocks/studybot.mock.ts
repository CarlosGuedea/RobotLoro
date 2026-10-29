import { CRITERIA, CRITERIA_BY_KEY } from '@/config/criteria'
import { getVariableStatus } from '@/lib/criteria'
import type { Evaluation, Place, SensorReading, VariableKey, VariableResult } from '@/types/domain'
import type { StudyBotApi } from '../api/contract'
import { MOCK_EVALUATIONS } from './data'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const random = (min: number, max: number) => min + Math.random() * (max - min)
const round = (n: number) => Math.round(n * 10) / 10

const evaluations = [...MOCK_EVALUATIONS]

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
    temperatureC: round(23.5 + Math.sin(t / 9) * 1.6 + random(-0.3, 0.3)),
    noiseDb: round(42 + Math.sin(t / 4) * 9 + random(-3, 3)),
  }
}

function simulateVariables(): VariableResult[] {
  const reading = readingAt(new Date())
  const values: Record<VariableKey, number> = {
    temperatura: reading.temperatureC,
    ruido: reading.noiseDb,
    iluminacion: Math.round(random(35, 95)),
    ocupacion: Math.round(random(5, 85)),
    mobiliario: Math.round(random(30, 100)),
  }
  return CRITERIA.map(({ key }) => ({
    key,
    value: values[key],
    status: getVariableStatus(CRITERIA_BY_KEY[key], values[key]),
  }))
}

/** Implementación simulada del backend para maquetar sin el ESP32. */
export const mockStudyBotApi: StudyBotApi = {
  async getDeviceStatus() {
    await delay(300)
    return {
      online: true,
      name: 'StudyBot Loro v1.0',
      firmware: '0.4.2',
      ip: '192.168.1.50',
      lastSeen: new Date(Date.now() - 4_000).toISOString(),
      components: { camera: 'ok', temperature: 'ok', microphone: 'ok', display: 'ok' },
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

  async createEvaluation({ placeName, notes }) {
    // Foto (ESP32-CAM) + lectura de sensores + inferencia del modelo.
    await delay(3_200)
    const variables = simulateVariables()
    const score = variables.reduce((acc, v) => {
      const factor = v.status === 'optimo' ? 1 : v.status === 'aceptable' ? 0.6 : 0
      return acc + factor * CRITERIA_BY_KEY[v.key].weight
    }, 0)
    const verdict = score >= 0.7 ? 'apto' : 'no_apto'
    const evaluation: Evaluation = {
      id: `ev-${Date.now()}`,
      photoUrl: verdict === 'apto' ? '/mock/lugar-tranquilo.svg' : '/mock/lugar-concurrido.svg',
      placeId: toPlaceId(placeName),
      placeName: placeName.trim(),
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      verdict,
      confidence: Math.round((0.7 + Math.random() * 0.28) * 100) / 100,
      variables,
    }
    evaluations.unshift(evaluation)
    return evaluation
  },

  async getCriteria() {
    await delay(200)
    return CRITERIA
  },
}
