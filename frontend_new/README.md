# StudyBot Loro · Dashboard

Frontend del proyecto StudyBot (Universidad de Colima). Desde aquí se acciona la cámara del
loro (ESP32-CAM) y el modelo LorBot responde si el lugar es **apto** o **no apto** para
trabajar, con base en la temperatura (°C), el ruido (dBFS) y la foto.

> Conectado al backend real (`../backend/server.py`). Para maquetar sin backend usa
> `VITE_USE_MOCKS=true`.

## Stack

| Herramienta                                           | Para qué                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Vite](https://vite.dev) + React 19 + TypeScript      | Base de la SPA, tipado estricto                                                  |
| Tailwind CSS v4                                       | Estilos con tokens de marca (`src/index.css`)                                    |
| Componentes estilo [shadcn/ui](https://ui.shadcn.com) | UI propia en `src/components/ui` (`components.json` listo para `npx shadcn add`) |
| React Router                                          | Rutas con carga diferida por página                                              |
| TanStack Query                                        | Peticiones, caché, polling de sensores                                           |
| Recharts                                              | Gráfica de temperatura/humedad                                                   |
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

- `VITE_API_URL`: vacío = mismo origen (recomendado). En `npm run dev` Vite reenvía `/api` a
  `VITE_PROXY_TARGET` (por defecto `http://127.0.0.1:8000`); en producción el backend sirve
  `dist/` y la API en el mismo puerto.
- `VITE_USE_MOCKS`: `true` para datos simulados, `false` (por defecto) para el backend real.

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

## Contrato con el backend

Definido en `src/services/api/contract.ts`; los tipos están en `src/types/domain.ts`.
Implementado en `../backend/server.py`. Errores: `{ "error": "mensaje" }`. POST y PUT deben
enviarse como `application/json` (si no, 415).

| Método | Endpoint                        | Respuesta         | Descripción                                              |
| ------ | ------------------------------- | ----------------- | -------------------------------------------------------- |
| GET    | `/api/device/status`            | `DeviceStatus`    | Cámara, DHT22, sensor de sonido y API LorBot             |
| GET    | `/api/sensors/latest`           | `SensorReading`   | Última lectura del ESP32 de sensores (polling cada 3 s)  |
| GET    | `/api/sensors/history?limit=30` | `SensorReading[]` | Promedio por minuto (se guarda en memoria, ~1 h)         |
| GET    | `/api/places`                   | `Place[]`         | Lugares ya probados (agrupados desde las evaluaciones)   |
| GET    | `/api/evaluations?placeId=`     | `Evaluation[]`    | Historial de evaluaciones (persistido en `data/`)        |
| POST   | `/api/evaluations`              | `Evaluation`      | **Lee sensores, toma la foto, consulta LorBot y guarda** |
| GET    | `/api/photos/<id>.jpg`          | JPEG              | Foto de cada evaluación                                  |
| GET    | `/api/settings`                 | `DeviceSettings`  | Direcciones de la ESP32-CAM y del ESP32 de sensores      |
| PUT    | `/api/settings`                 | `DeviceSettings`  | Guarda direcciones (acepta IP o nombre sin `http://`)    |

Cuerpo de `POST /api/evaluations` (JSON):

```json
{
  "placeName": "Biblioteca central",
  "notes": "Sala 2",
  "temperatureC": 29.5,
  "soundDbfs": -28.4,
  "soundSource": "microfono",
  "photo": "data:image/jpeg;base64,..."
}
```

Solo `placeName` es obligatorio. Sin `temperatureC` se usa el DHT22; sin `soundDbfs` se usa
`sound_dbfs` del ESP32 de sensores (si su firmware lo reporta); sin `photo` se dispara la
ESP32-CAM. Si falta temperatura o ruido responde 422 antes de tomar la foto.

### El ruido en dBFS

El modelo se entrenó con ruido en **dBFS** (media −21.9, rango típico −30.6 a −13.3). El
sensor de sonido actual del loro es digital (solo sí/no), así que en «Evaluar lugar» el botón
del micrófono mide 3 s con el micrófono del dispositivo que abre el dashboard (RMS, sin
control automático de ganancia). El navegador solo permite el micrófono en `localhost` o
HTTPS; desde otra IP de la red hay que escribir el valor a mano.

### Lugares nuevos

No hay catálogo de lugares: quien evalúa escribe el nombre del lugar (texto libre) y,
opcionalmente, una referencia. El backend genera `placeId` a partir del nombre (slug sin
acentos) para agrupar visitas repetidas; `GET /api/places` solo devuelve lugares que ya
tienen al menos una evaluación.

## Marca

Los colores viven en `src/index.css` (escalas `loro` y `pico`). Son una aproximación al verde
institucional UdeC y a los colores del loro; si tienen los códigos oficiales del manual de
identidad, basta con reemplazar esos valores.
