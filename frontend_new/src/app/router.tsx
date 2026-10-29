import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/layout/PageLoader'

/** Cada página se carga bajo demanda para mantener ligero el bundle inicial. */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    HydrateFallback: PageLoader,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage })),
      },
      {
        path: 'evaluar',
        lazy: () => import('@/pages/EvaluatePage').then((m) => ({ Component: m.EvaluatePage })),
      },
      {
        path: 'lugares',
        lazy: () => import('@/pages/PlacesPage').then((m) => ({ Component: m.PlacesPage })),
      },
      {
        path: 'historial',
        lazy: () => import('@/pages/HistoryPage').then((m) => ({ Component: m.HistoryPage })),
      },
      {
        path: 'criterios',
        lazy: () => import('@/pages/CriteriaPage').then((m) => ({ Component: m.CriteriaPage })),
      },
      {
        path: '*',
        lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
      },
    ],
  },
])
