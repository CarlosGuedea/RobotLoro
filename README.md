# Proyecto Loro · StudyBot

El loro dice si un lugar es **apto** o **no apto** para estudiar. Una **ESP32-CAM AI Thinker
(OV2640)** toma la foto, un segundo ESP32 publica temperatura, humedad y nivel de ruido en dBFS
(micrófono **INMP441** I²S), y el modelo **LorBot** (CLIP + SVM, en `LorBot_API/`) da el
veredicto. El dashboard web muestra sensores en vivo, evalúa lugares y guarda el historial.

```text
frontend_new/                   Dashboard (React + Vite). Se compila a frontend_new/dist
backend/                        Servidor Python: cámara, sensores, LorBot y API del dashboard
  server.py                     Rutas HTTP y orquestación de la evaluación
  lorbot.py                     Cliente de la API LorBot (POST /predict)
  store.py                      Historial en data/evaluations.json + data/photos/
  sensors.py                    Validación de las muestras del ESP32 de sensores
  tests/                        Pruebas HTTP y hardware simulado
firmware/
  esp32cam_web/                 Sketch de la ESP32-CAM
  esp32_sensores/               Sketch: DHT22 e INMP441 I²S (ruido en dBFS)
packaging/                      Lanzador y empaquetado como ejecutable (Windows/Linux)
frontend/                       Página anterior (HTML/JS). Ya no la sirve el backend
docs/                           Diseño y plan
```

## Flujo

```text
Dashboard «Evaluar lugar» → POST /api/evaluations (nombre, ruido en dBFS, temperatura opcional)
  1. backend lee el ESP32 de sensores (temperatura si no se escribió)
  2. backend pide GET /capture a la ESP32-CAM (o usa la foto subida)
  3. backend envía foto + temperatura + ruido a LorBot POST /predict
  ← «Apto» / «No apto», guardado con su foto en data/
```

El modelo necesita el ruido en **dBFS**. Lo mide el **INMP441** del ESP32 de sensores
(`sound_dbfs` en `/readings`, RMS de ventanas de 100 ms) y el backend lo usa si no se escribe
otro valor. Si el micrófono falla o la placa tiene el detector digital anterior (KY-038, solo
sí/no), el dashboard lo mide con el micrófono del dispositivo (botón 🎤) o se escribe a mano.

## 1. Cargar la ESP32-CAM

1. En Arduino IDE instala **esp32 by Espressif Systems** desde el gestor de placas.
2. Abre `firmware/esp32cam_web/esp32cam_web.ino`.
3. Selecciona **AI Thinker ESP32-CAM**, el puerto de su adaptador USB serie y velocidad de carga **115200**, si la versión instalada muestra esa opción. Para fijarla desde Arduino CLI, consulta `firmware/esp32cam_web/README.md`.
4. El sketch usa exactamente `linksys`, sin contraseña. La red debe ofrecer **2.4 GHz** y permitir comunicación entre sus dispositivos.
5. Carga el código. En placas sin carga automática, conecta GPIO0 a GND, pulsa RESET y carga; después **retira GPIO0 de GND y vuelve a pulsar RESET** para ejecutar.
6. Abre el monitor serie a **115200 baudios**. Mostrará si inició la OV2640 y la dirección `http://<IP>/`.

Usa alimentación estable de 5 V en el pin **5V** de la ESP32-CAM o su base USB compatible. Las señales del adaptador USB-TTL deben ser de **3.3 V**, con GND común. No conectes 5 V a RX/TX. El adaptador puede necesitar una alimentación separada adecuada para la cámara.

El firmware ofrece:

| Ruta en ESP32-CAM | Función |
| --- | --- |
| `GET /` | Página directa con botón para tomar una foto |
| `GET /capture` | Nueva foto JPEG |
| `GET /health` | Estado de inicialización de la cámara |

Puedes abrir `http://esp32cam.local/` si tu red permite mDNS; si no resuelve, utiliza la IP del monitor serie. Con PSRAM se configura 800 × 600; sin PSRAM, 320 × 240. El flash queda apagado.

## 2. Iniciar el producto

**Versión empaquetada** (sin instalar Python ni Node): ver [`packaging/README.md`](packaging/README.md).
Un solo ejecutable arranca modelo, backend y dashboard.

**Desde el código:**

Se necesitan dos procesos, cada uno en su terminal:

1. **API LorBot** (modelo): abre `LorBot_API/Iniciar.command` y espera a que escuche en
   `http://127.0.0.1:5055`. La primera vez descarga CLIP.
2. **Backend + dashboard**: desde esta carpeta,

```bash
./Iniciar.command
```

Crea `.venv`, instala dependencias, compila el dashboard si falta `frontend_new/dist` (necesita
Node.js) e inicia el servidor. Abre **[http://localhost:8000](http://localhost:8000)**.

Equivalente manual:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend_new ci && npm --prefix frontend_new run build
.venv/bin/python backend/server.py
```

Tras cambiar el dashboard, vuelve a ejecutar `npm --prefix frontend_new run build`. Para
desarrollarlo con recarga en caliente usa `npm --prefix frontend_new run dev`
(http://localhost:5173); Vite reenvía `/api` al backend (`VITE_PROXY_TARGET`, por defecto
`http://127.0.0.1:8000`).

Si `esp32cam.local` no resuelve, inicia Python con la IP mostrada en el monitor serie, por ejemplo:

```bash
python3 backend/server.py --camera-url http://192.168.1.50
```

La dirección del ejemplo debe sustituirse por la IP real de tu cámara. También puedes usar la variable de entorno `CAMERA_URL`.

Para abrir la interfaz desde otro dispositivo de la misma red:

```bash
python3 backend/server.py --host 0.0.0.0 --camera-url http://192.168.1.50
```

La consola muestra la dirección para otros equipos (`http://<IP-del-ordenador>:8000`) y el dashboard la ofrece con código QR en **Configuración → Abrir desde el celular**. El ejecutable empaquetado ya se abre así por defecto. El ordenador debe tener acceso a la cámara en `linksys`; si el router aísla clientes, ninguna captura desde Python podrá llegar a ella. Desde otra IP el navegador no permite usar el micrófono (solo `localhost` o HTTPS): el ruido lo mide el INMP441 o se escribe a mano.

Las direcciones de la cámara y los sensores también se cambian desde el dashboard, en **Configuración**; se guardan en `data/settings.json` y tienen prioridad sobre `--camera-url`/`--sensors-url`.

Si la API LorBot corre en otra máquina o puerto: `--api-url http://192.168.1.20:5055` (o `LORBOT_URL`). El historial se guarda en `data/` (`--data-dir` o `LORO_DATA_DIR` para cambiarlo).

## API Python

Rutas del dashboard (detalle y ejemplos en `frontend_new/README.md`):

| Ruta | Respuesta |
| --- | --- |
| `GET /api/device/status` | Estado de cámara, DHT22, sensor de sonido y API LorBot |
| `GET /api/sensors/latest` | Última lectura de sensores |
| `GET /api/sensors/history?limit=30` | Promedio por minuto de la última hora (en memoria) |
| `POST /api/evaluations` | Lee sensores, toma la foto, consulta LorBot y guarda el resultado |
| `GET /api/evaluations?placeId=` · `GET /api/places` | Historial y lugares probados |
| `GET /api/photos/<id>.jpg` | Foto de una evaluación |
| `GET` · `PUT /api/settings` | Direcciones de la cámara y los sensores (`cameraUrl`, `sensorsUrl`) |
| `GET /api/network` | Si el dashboard está abierto a la red y su dirección (`shared`, `url`) |

Rutas originales, se conservan:

| Ruta | Respuesta |
| --- | --- |
| `POST /api/capture` | Solicita y devuelve JPEG; fecha de recepción en `X-Captured-At` |
| `GET /api/latest.jpg` | Última fotografía, sin solicitar otra; 404 si no existe |
| `GET /api/status` | Direcciones configuradas, cantidad de capturas y fecha de la última |
| `GET /api/sensors` | Consulta y devuelve la muestra cruda del ESP32 de sensores |

Cualquier otra ruta devuelve el dashboard compilado.

## ESP32 de sensores

Carga `firmware/esp32_sensores/esp32_sensores.ino` en la placa **ESP32 Dev Module**, a 115200 baudios. DHT22 DATA en GPIO27; INMP441 SCK en GPIO26, WS en GPIO25, SD en GPIO33, L/R a GND y VDD a 3V3. En el montaje verificado con Arduino-ESP32 2.0.17 se selecciona el slot derecho del driver (`MICROPHONE_LEFT_CHANNEL=false`). Consulta `firmware/esp32_sensores/README.md` para el formato PCM, niveles RMS/dBFS y configuración del umbral. El firmware se conecta a **linksys**, sin contraseña, y anuncia `esp32sensores.local`. Esta es una placa diferente a la ESP32-CAM; identifica el puerto antes de cargar.

Python consulta `http://esp32sensores.local/readings` y el frontend actualiza sus valores cada tres segundos. Si necesitas usar una IP concreta:

```bash
python3 backend/server.py --sensors-url http://192.168.1.130
```

Sustituye esa IP de ejemplo por la que aparezca en el monitor serie. Puedes combinar `--sensors-url` y `--camera-url`, o usar `SENSORS_URL` y `CAMERA_URL`.

Un DHT22 desconectado se muestra con guiones para temperatura/humedad, manteniendo disponible el audio. Un INMP441 sin señal no impide mostrar el DHT22. Si el ESP32 no responde o la muestra tiene más de diez segundos, no se presentan los datos anteriores como actuales. El INMP441 se muestrea en una tarea independiente y muestra niveles RMS en dBFS, con umbral inicial de -35 dBFS. No son dB SPL calibrados. Solo se transmiten estadísticas de audio, sin grabaciones.

Solo se admite una captura simultánea; otras reciben 409. Cámara inaccesible, error del sensor o JPEG inválido: 502 con mensaje JSON. Tamaño máximo: 2 MiB; espera de conexión/lectura configurable con `--timeout` (8 segundos por defecto). La fecha es la de recepción en el backend, no un reloj sincronizado en la cámara.

Esta implementación es para una red local de confianza: HTTP sin autenticación y sin publicación en Internet. No incluye grabación ni transmisión continua.

## Pruebas

Desde la raíz, con el entorno virtual activo:

```bash
python3 -m unittest discover -s backend/tests -v
node --test frontend/tests/sensors.test.cjs
```

Para probar el flujo completo sin hardware (con la API LorBot iniciada), en terminales separadas:

```bash
python3 backend/tests/mock_camera.py --port 8001
python3 backend/server.py --camera-url http://127.0.0.1:8001 --sensors-url http://127.0.0.1:8001
```

El simulador responde como cámara y como ESP32 de sensores; por defecto responde como el firmware con INMP441 (ruido en dBFS); con `--ky038` imita el detector digital anterior, sin dBFS. La imagen dice **CAMARA SIMULADA - SOLO PRUEBAS**; no es una imagen física de la OV2640.

## Referencias

- [Pinout AI Thinker de Espressif](https://github.com/espressif/arduino-esp32/blob/3.3.2/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h).
- [Controlador esp32-camera](https://github.com/espressif/esp32-camera).
- [Servidor HTTP de Python](https://docs.python.org/3/library/http.server.html).
- Fuente Geist distribuida con licencia OFL en `frontend/FONT-LICENSE.txt`.
