import type { Evaluation, VariableResult } from '@/types/domain'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

const vars = (temperature: number, noise: number): VariableResult[] => [
  { key: 'temperatura', value: temperature, source: 'sensor' },
  { key: 'ruido', value: noise, source: 'microfono' },
]

/** Datos de ejemplo SOLO para `VITE_USE_MOCKS=true`. */
export const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: 'ev-108',
    notes: 'Planta alta, mesas junto a ventanas',
    placeId: 'biblioteca-central-sala-2',
    placeName: 'Biblioteca central · Sala 2',
    createdAt: minutesAgo(12),
    verdict: 'apto',
    photoUrl: '/mock/lugar-tranquilo.svg',
    photoSource: 'camara',
    variables: vars(28.4, -29.5),
  },
  {
    id: 'ev-107',
    notes: 'Hora de la comida',
    placeId: 'cafeteria-fie',
    placeName: 'Cafetería FIE',
    createdAt: minutesAgo(48),
    verdict: 'no_apto',
    photoUrl: '/mock/lugar-concurrido.svg',
    photoSource: 'camara',
    variables: vars(32.1, -14.2),
  },
  {
    id: 'ev-106',
    notes: 'Facultad de Telemática',
    placeId: 'laboratorio-de-computo-3',
    placeName: 'Laboratorio de cómputo 3',
    createdAt: minutesAgo(95),
    verdict: 'apto',
    photoUrl: '/mock/lugar-tranquilo.svg',
    photoSource: 'camara',
    variables: vars(26.9, -27.8),
  },
  {
    id: 'ev-105',
    notes: 'Bancas bajo los árboles',
    placeId: 'jardin-central',
    placeName: 'Jardín central',
    createdAt: minutesAgo(180),
    verdict: 'no_apto',
    photoUrl: '/mock/lugar-concurrido.svg',
    photoSource: 'subida',
    variables: vars(34.6, -19.0),
  },
]
