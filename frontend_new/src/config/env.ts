/** Acceso tipado a las variables de entorno de Vite (ver `.env.example`). */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true',
} as const
