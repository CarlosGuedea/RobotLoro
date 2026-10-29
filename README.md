# Proyecto Loro

Captura de fotografías bajo demanda desde una **ESP32-CAM AI Thinker con OV2640**, con frontend web y backend Python. Un segundo ESP32 publica temperatura, humedad y detección digital de sonido por Wi-Fi; la misma página muestra las lecturas.

```text
frontend/                       Página web: HTML, CSS, JavaScript y fuente local
backend/                        Receptor de imágenes y servidor HTTP Python
  server.py
  requirements.txt
  tests/                        Pruebas HTTP y cámara simulada
firmware/
  esp32cam_web/                 Sketch de la ESP32-CAM
  esp32_sensores/               Sketch existente: DHT22 y sonido digital
docs/                           Diseño y plan
```

## Flujo

```text
Botón «Tomar foto» → POST /api/capture en Python
                  → GET /capture en ESP32-CAM
                  ← JPEG de la OV2640
                  ← Fotografía mostrada en el navegador
```

No se solicitan fotografías automáticamente. La captura anterior se conserva si un nuevo intento falla. Python conserva solo la última imagen en memoria; se pierde al reiniciar. El botón **Descargar foto** permite guardar una copia en el navegador.

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

## 2. Iniciar backend y frontend

En una terminal, desde la carpeta raíz del proyecto:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt
python3 backend/server.py
```

Abre **[http://localhost:8000](http://localhost:8000)** y pulsa **Tomar foto**. El backend sirve los archivos de `frontend/`; no abras `index.html` con doble clic ni necesitas un servidor adicional de frontend.

Si `esp32cam.local` no resuelve, inicia Python con la IP mostrada en el monitor serie, por ejemplo:

```bash
python3 backend/server.py --camera-url http://192.168.1.50
```

La dirección del ejemplo debe sustituirse por la IP real de tu cámara. También puedes usar la variable de entorno `CAMERA_URL`.

Para abrir la interfaz desde otro dispositivo de la misma red:

```bash
python3 backend/server.py --host 0.0.0.0 --camera-url http://192.168.1.50
```

Abre entonces `http://<IP-del-ordenador>:8000`. El ordenador debe tener acceso a la cámara en `linksys`; si el router aísla clientes, ninguna captura desde Python podrá llegar a ella.

## API Python

| Ruta | Respuesta |
| --- | --- |
| `POST /api/capture` | Solicita y devuelve JPEG; fecha de recepción en `X-Captured-At` |
| `GET /api/latest.jpg` | Última fotografía, sin solicitar otra; 404 si no existe |
| `GET /api/status` | Dirección configurada, cantidad de capturas y fecha de la última |
| `GET /api/sensors` | Consulta y devuelve temperatura, humedad y sonido del ESP32 de sensores |

## ESP32 de sensores

Carga `firmware/esp32_sensores/esp32_sensores.ino` en la placa **ESP32 Dev Module**, a 115200 baudios. DHT22 DATA en GPIO27; sensor de sonido OUT en GPIO26. El firmware se conecta a **linksys**, sin contraseña, y anuncia `esp32sensores.local`. Esta es una placa diferente a la ESP32-CAM; identifica el puerto antes de cargar.

Python consulta `http://esp32sensores.local/readings` y el frontend actualiza sus valores cada tres segundos. Si necesitas usar una IP concreta:

```bash
python3 backend/server.py --sensors-url http://192.168.1.130
```

Sustituye esa IP de ejemplo por la que aparezca en el monitor serie. Puedes combinar `--sensors-url` y `--camera-url`, o usar `SENSORS_URL` y `CAMERA_URL`.

Un DHT22 desconectado se muestra con guiones para temperatura/humedad, manteniendo disponible el sonido. Si el ESP32 no responde o la muestra tiene más de diez segundos, no se presentan los datos anteriores como actuales. El sonido indica si se observó el nivel digital activo durante la ventana de muestreo; no mide decibeles y puede perder pulsos breves durante operaciones de lectura o red.

Solo se admite una captura simultánea; otras reciben 409. Cámara inaccesible, error del sensor o JPEG inválido: 502 con mensaje JSON. Tamaño máximo: 2 MiB; espera de conexión/lectura configurable con `--timeout` (8 segundos por defecto). La fecha es la de recepción en el backend, no un reloj sincronizado en la cámara.

Esta implementación es para desarrollo en una red local de confianza: HTTP sin autenticación y sin publicación en Internet. No incluye grabación, transmisión continua, almacenamiento histórico ni análisis de IA.

## Pruebas

Desde la raíz, con el entorno virtual activo:

```bash
python3 -m unittest discover -s backend/tests -v
node --test frontend/tests/sensors.test.cjs
```

Para probar el flujo completo sin hardware, en terminales separadas:

```bash
python3 -m backend.tests.mock_camera --port 8001
python3 backend/server.py --port 8002 --camera-url http://127.0.0.1:8001
```

Abre `http://localhost:8002`. La imagen dice **CAMARA SIMULADA - SOLO PRUEBAS**; no es una imagen física de la OV2640.

## Referencias

- [Pinout AI Thinker de Espressif](https://github.com/espressif/arduino-esp32/blob/3.3.2/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h).
- [Controlador esp32-camera](https://github.com/espressif/esp32-camera).
- [Servidor HTTP de Python](https://docs.python.org/3/library/http.server.html).
- Fuente Geist distribuida con licencia OFL en `frontend/FONT-LICENSE.txt`.
