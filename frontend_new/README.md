# StudyBot Loro · Dashboard

Frontend del proyecto StudyBot (Universidad de Colima). Desde aquí se acciona la cámara del
loro (ESP32-CAM) y el backend responde si el lugar es **apto** o **no apto** para trabajar,
con base en temperatura, ruido y las variables que se obtienen de la foto.

> Estado actual: **maqueta funcional** con datos simulados (`VITE_USE_MOCKS=true`).

## Stack

| Herramienta                                           | Para qué                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Vite](https://vite.dev) + React 19 + TypeScript      | Base de la SPA, tipado estricto                                                  |
| Tailwind CSS v4                                       | Estilos con tokens de marca (`src/index.css`)                                    |
| Componentes estilo [shadcn/ui](https://ui.shadcn.com) | UI propia en `src/components/ui` (`components.json` listo para `npx shadcn add`) |
| React Router                                          | Rutas con carga diferida por página                                              |
| TanStack Query                                        | Peticiones, caché, polling de sensores                                           |
| Recharts                                              | Gráfica de temperatura/ruido                                                     |
| lucide-react · sonner                                 | Íconos · notificaciones                                                          |
| oxlint · Prettier                                     | Lint y formato                                                                   |

## Comandos

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + build de producción
npm run lint         # oxlint
npm run format       # prettier
```

Copia `.env.example` a `.env.local` y ajusta:

- `VITE_API_URL`: URL del backend.
- `VITE_USE_MOCKS`: `true` para datos simulados, `false` para usar el backend real.

## Estructura

```
src/
├── app/              # App, providers (Query, Toaster) y router
├── components/
│   ├── brand/        # ParrotBot (loro con estados de ánimo) y Logo
│   ├── layout/       # AppLayout, Sidebar, Topbar, PageHeader
│   ├── shared/       # Componentes de dominio reutilizables (badges, RangeBar, StatCard…)
│   └── ui/           # Primitivos de UI (Button, Card, Badge, Table…)
├── config/           # env, navegación y criterios (rangos/pesos de cada variable)
├── features/         # Lógica por dominio: hooks de datos + componentes
│   ├── criteria/
│   ├── device/
│   ├── evaluations/
│   ├── places/
│   └── sensors/
├── hooks/            # Hooks genéricos (tema)
├── lib/              # Utilidades (cn, formatos es-MX, clasificación de variables)
├── pages/            # Una página por ruta
├── services/
│   ├── api/          # Contrato `StudyBotApi`, cliente HTTP e implementación real
│   ├── mocks/        # Implementación simulada con el mismo contrato
│   └── query-keys.ts
└── types/            # Tipos del dominio
```

Regla: las páginas componen _features_; los componentes nunca llaman `fetch` directamente,
siempre pasan por los hooks de `features/*/hooks`, que usan `services`.

## Contrato propuesto con el backend

Definido en `src/services/api/contract.ts`; los tipos están en `src/types/domain.ts`.

| Método | Endpoint                                   | Respuesta         | Descripción                                                             |
| ------ | ------------------------------------------ | ----------------- | ----------------------------------------------------------------------- |
| GET    | `/api/device/status`                       | `DeviceStatus`    | Estado del StudyBot y sus componentes                                   |
| GET    | `/api/sensors/latest`                      | `SensorReading`   | Última lectura (polling cada 3 s)                                       |
| GET    | `/api/sensors/history?limit=30`            | `SensorReading[]` | Historial de lecturas                                                   |
| GET    | `/api/places`                              | `Place[]`         | Lugares ya probados (agrupados desde las evaluaciones)                  |
| GET    | `/api/evaluations?placeId=`                | `Evaluation[]`    | Historial de evaluaciones                                               |
| POST   | `/api/evaluations` `{ placeName, notes? }` | `Evaluation`      | **Toma la foto, lee sensores, corre el modelo y devuelve el veredicto** |
| GET    | `/api/criteria`                            | `Criterion[]`     | Rangos y pesos de cada variable                                         |

Ejemplo de `Evaluation`:

```json
{
  "id": "ev-108",
  "placeId": "biblio-central-2",
  "placeName": "Biblioteca central · Sala 2",
  "notes": "Planta alta, mesas junto a ventanas",
  "createdAt": "2026-10-28T16:20:00Z",
  "verdict": "apto",
  "confidence": 0.93,
  "photoUrl": "http://192.168.1.50/captures/ev-108.jpg",
  "variables": [
    { "key": "temperatura", "value": 23.4, "status": "optimo" },
    { "key": "ruido", "value": 38, "status": "optimo" }
  ]
}
```

### Lugares nuevos

No hay catálogo de lugares: quien evalúa escribe el nombre del lugar (texto libre) y,
opcionalmente, una referencia. El backend genera `placeId` a partir del nombre (por ejemplo,
un slug sin acentos) para agrupar visitas repetidas al mismo lugar; `GET /api/places` solo
devuelve lugares que ya tienen al menos una evaluación.

## Marca

Los colores viven en `src/index.css` (escalas `loro` y `pico`). Son una aproximación al verde
institucional UdeC y a los colores del loro; si tienen los códigos oficiales del manual de
identidad, basta con reemplazar esos valores.
