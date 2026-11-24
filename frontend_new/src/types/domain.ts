/** Resultado global que devuelve el modelo LorBot para un lugar. */
export type Verdict = 'apto' | 'no_apto'

/** Si el valor cae dentro del rango de los datos con que se entrenó el modelo. */
export type VariableStatus = 'en_rango' | 'fuera_de_rango'

/** Variables numéricas que recibe el modelo junto con la foto. */
export type VariableKey = 'temperatura' | 'ruido'

/** De dónde salió cada valor enviado al modelo. */
export type MeasurementSource = 'sensor' | 'manual' | 'microfono'

export interface Criterion {
  key: VariableKey
  label: string
  unit: string
  description: string
  /** Rango típico de los datos de entrenamiento (media ± 2 desviaciones). */
  reference: [min: number, max: number]
  /** Media de los datos de entrenamiento. */
  trainingMean: number
  /** Rango para pintar barras/medidores. */
  scale: [min: number, max: number]
}

export interface VariableResult {
  key: VariableKey
  value: number
  source: MeasurementSource
}

export interface Evaluation {
  id: string
  /** Lo genera el backend a partir del nombre (slug), para agrupar visitas al mismo lugar. */
  placeId: string
  placeName: string
  /** Referencia opcional que escribe quien evalúa (piso, zona, ventana…). */
  notes?: string
  createdAt: string
  verdict: Verdict
  photoUrl?: string
  /** `camara`: la tomó la ESP32-CAM; `subida`: se subió desde el navegador. */
  photoSource: 'camara' | 'subida'
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
  /** null si el DHT22 no entrega lectura. */
  temperatureC: number | null
  humidityPct: number | null
  /** Sonido por encima del umbral (INMP441: −35 dBFS; detector digital: su potenciómetro). */
  soundDetected: boolean
  /** Ruido RMS en dBFS (INMP441). null si el micrófono falla o la placa solo detecta sí/no. */
  soundDbfs: number | null
  /** `inmp441`: micrófono I²S que mide dBFS; `digital`: detector anterior (KY-038), solo sí/no. */
  soundSource: 'inmp441' | 'digital'
  /** Solo INMP441: false si no entrega audio (cableado, señal constante o lectura vieja). */
  soundOk: boolean | null
  /** El INMP441 llegó al máximo digital: el ruido real es mayor que el medido. */
  soundClipped: boolean
}

export type ComponentHealth = 'ok' | 'degradado' | 'error'

export interface DeviceComponent {
  key: 'camera' | 'temperature' | 'microphone' | 'model'
  label: string
  health: ComponentHealth
  detail: string
}

export interface DeviceStatus {
  online: boolean
  name: string
  /** Hora de la última lectura de sensores recibida. */
  lastSeen: string | null
  components: DeviceComponent[]
}

/** Si el dashboard se puede abrir desde otros equipos de la red local. */
export interface NetworkInfo {
  /** false si StudyBot se inició solo para esta computadora (--host 127.0.0.1). */
  shared: boolean
  port: number
  /** Dirección para celulares y otras computadoras en la misma red; null si no se detectó. */
  url: string | null
}

/** Direcciones de los ESP32 (se guardan en el backend). */
export interface DeviceSettings {
  cameraUrl: string
  sensorsUrl: string
}

export interface CreateEvaluationInput {
  /** Texto libre: el lugar puede ser nuevo, no tiene que existir antes. */
  placeName: string
  notes?: string
  /** Si se omite, el backend usa la lectura del DHT22. */
  temperatureC?: number
  /** Si se omite, el backend usa el dBFS del sensor (si su firmware lo reporta). */
  soundDbfs?: number
  soundSource?: 'manual' | 'microfono'
  /** Foto subida (data URL). Si se omite, el backend dispara la ESP32-CAM. */
  photo?: string
}
