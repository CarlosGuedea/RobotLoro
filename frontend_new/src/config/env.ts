/** Acceso tipado a las variables de entorno de Vite (ver `.env.example`). */
export const env = {
  /** Vacío = mismo origen (proxy de Vite en desarrollo, backend sirviendo el build en producción). */
  apiUrl: import.meta.env.VITE_API_URL || window.location.origin,
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
} as const
