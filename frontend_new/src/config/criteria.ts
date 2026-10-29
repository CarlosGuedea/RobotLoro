import type { Criterion, VariableKey } from '@/types/domain'

/**
 * Variables que considera el modelo (ya entrenado) para decidir si un lugar es apto.
 * Los rangos y pesos son de maqueta: reemplácenlos con los del modelo, o tómenlos de
 * `GET /api/criteria` cuando el backend esté listo.
 */
export const CRITERIA: Criterion[] = [
  {
    key: 'temperatura',
    label: 'Temperatura',
    unit: '°C',
    source: 'sensor',
    description: 'Confort térmico medido por el sensor del loro.',
    weight: 0.25,
    ideal: [21, 25],
    acceptable: [18, 28],
    scale: [10, 40],
  },
  {
    key: 'ruido',
    label: 'Ruido',
    unit: 'dB',
    source: 'sensor',
    description: 'Nivel sonoro promedio captado por el micrófono.',
    weight: 0.3,
    ideal: [30, 45],
    acceptable: [25, 60],
    scale: [20, 90],
  },
  {
    key: 'iluminacion',
    label: 'Iluminación',
    unit: '%',
    source: 'camara',
    description: 'Luminosidad estimada a partir de la foto.',
    weight: 0.2,
    ideal: [60, 90],
    acceptable: [40, 100],
    scale: [0, 100],
  },
  {
    key: 'ocupacion',
    label: 'Ocupación',
    unit: '%',
    source: 'camara',
    description: 'Qué tan lleno está el lugar según la foto.',
    weight: 0.15,
    ideal: [0, 40],
    acceptable: [0, 70],
    scale: [0, 100],
  },
  {
    key: 'mobiliario',
    label: 'Mobiliario',
    unit: '%',
    source: 'camara',
    description: 'Probabilidad de que haya mesa y silla disponibles.',
    weight: 0.1,
    ideal: [70, 100],
    acceptable: [40, 100],
    scale: [0, 100],
  },
]

export const CRITERIA_BY_KEY = Object.fromEntries(CRITERIA.map((c) => [c.key, c])) as Record<
  VariableKey,
  Criterion
>
