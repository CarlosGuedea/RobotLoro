/** Resultado global que devuelve el backend para un lugar. */
export type Verdict = 'apto' | 'no_apto'

/** Cómo quedó una variable respecto a los rangos definidos en los criterios. */
export type VariableStatus = 'optimo' | 'aceptable' | 'fuera_de_rango'

/** De dónde obtiene el backend cada variable. */
export type VariableSource = 'sensor' | 'camara'

export type VariableKey = 'temperatura' | 'ruido' | 'iluminacion' | 'ocupacion' | 'mobiliario'

export interface Criterion {
  key: VariableKey
  label: string
  unit: string
  source: VariableSource
  description: string
  /** Peso relativo dentro del modelo (0–1). */
  weight: number
  ideal: [min: number, max: number]
  acceptable: [min: number, max: number]
  /** Rango para pintar barras/medidores. */
  scale: [min: number, max: number]
}

export interface VariableResult {
  key: VariableKey
  value: number
  status: VariableStatus
}

export interface Evaluation {
  id: string
  /** Lo genera el backend a partir del nombre (ej. slug), para agrupar visitas al mismo lugar. */
  placeId: string
  placeName: string
  /** Referencia opcional que escribe quien evalúa (piso, zona, ventana…). */
  notes?: string
  createdAt: string
  verdict: Verdict
  /** Confianza del modelo (0–1). */
  confidence: number
  photoUrl?: string
  variables: VariableResult[]
}

/** Lugar ya probado. No es un catálogo: se crea en el backend al evaluar un lugar nuevo. */
export interface Place {
  id: string
  name: string
  lastEvaluation: Evaluation
  evaluationsCount: number
}

export interface SensorReading {
  timestamp: string
  temperatureC: number
  noiseDb: number
}

export type ComponentHealth = 'ok' | 'degradado' | 'error'

export interface DeviceStatus {
  online: boolean
  name: string
  firmware: string
  ip: string
  lastSeen: string
  components: {
    camera: ComponentHealth
    temperature: ComponentHealth
    microphone: ComponentHealth
    display: ComponentHealth
  }
}

export interface CreateEvaluationInput {
  /** Texto libre: el lugar puede ser nuevo, no tiene que existir antes. */
  placeName: string
  notes?: string
}
