import type { Criterion, VariableKey } from '@/types/domain'

/**
 * Lo que recibe el modelo LorBot (`LorBot_API/lorbot_pipeline.joblib`): temperatura en °C,
 * ruido en dBFS y la foto. Las medias y rangos salen del `StandardScaler` del modelo
 * (media ± 2 desviaciones de los datos de entrenamiento); no son umbrales de apto/no apto.
 */
export const CRITERIA: Criterion[] = [
  {
    key: 'temperatura',
    label: 'Temperatura',
    unit: '°C',
    description: 'Temperatura del lugar, medida por el DHT22 del loro.',
    trainingMean: 30.9,
    reference: [26.8, 34.9],
    scale: [15, 45],
  },
  {
    key: 'ruido',
    label: 'Ruido',
    unit: 'dBFS',
    description: 'Nivel de sonido relativo a la escala completa del micrófono (0 dBFS = máximo).',
    trainingMean: -21.9,
    reference: [-30.6, -13.3],
    scale: [-70, 0],
  },
]

export const CRITERIA_BY_KEY = Object.fromEntries(CRITERIA.map((c) => [c.key, c])) as Record<
  VariableKey,
  Criterion
>

/** Modelo de visión que usa LorBot para comparar la foto con las descripciones. */
export const CLIP_MODEL = 'openai/clip-vit-base-patch32'

/**
 * Descripciones contra las que CLIP compara la foto (traducidas; en el modelo están en inglés).
 * La similitud con cada una entra al clasificador junto con temperatura y ruido.
 */
export const IMAGE_DESCRIPTIONS = [
  'Un asiento libre frente a una superficie de trabajo vacía',
  'Una silla de espaldas a la mesa más cercana',
  'Una mesa con todos los asientos ocupados',
  'Una silla libre en el borde de una mesa compartida',
  'Un escritorio con espacio para una laptop y un cuaderno',
  'Una silla libre junto a un escritorio con espacio para abrir un cuaderno',
  'Una silla sola, sin mesa ni escritorio al alcance',
  'Una mesa sin ninguna silla al lado',
  'Una mesa llena de objetos, con poco espacio para un cuaderno',
  'Varias personas sentadas hombro con hombro en una mesa llena',
  'Una mesa compartida con una silla libre y espacio de trabajo despejado',
  'Una silla con respaldo en un escritorio con espacio para las piernas',
  'Una silla apretada entre una mesa y una pared, con poco espacio para sentarse',
  'Un área exterior sin muebles, solo pavimento',
  'Un cuarto vacío, sin mesas ni sillas',
  'Una mesa y silla al aire libre bajo sol directo intenso',
  'Un escritorio con reflejo fuerte de luz solar directa',
  'Una mesa y silla al aire libre bajo sombra profunda',
  'Una mesa y silla en un área oscura con poca iluminación',
]
