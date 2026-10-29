/** Claves centralizadas de TanStack Query para invalidar caché sin strings sueltos. */
export const queryKeys = {
  device: ['device'] as const,
  readings: {
    latest: ['readings', 'latest'] as const,
    history: (limit: number) => ['readings', 'history', limit] as const,
  },
  places: ['places'] as const,
  evaluations: (placeId?: string) => ['evaluations', { placeId }] as const,
  evaluationsRoot: ['evaluations'] as const,
  criteria: ['criteria'] as const,
}
