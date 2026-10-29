# ESP32-CAM AI Thinker / OV2640

Abre `esp32cam_web.ino` desde Arduino IDE, elige **AI Thinker ESP32-CAM** y velocidad de carga **115200**. Las bibliotecas utilizadas están incluidas en Arduino-ESP32.

Red configurada: `linksys` sin contraseña. El monitor serie (115200 baudios) muestra la IP. `GET /capture` devuelve una nueva fotografía y `/` abre una vista directa con botón de captura. `/health` permite comprobar si el sensor se inicializó.

El backend Python solicita la foto cuando el usuario pulsa **Tomar foto** en el frontend. No es necesario configurar la IP del ordenador en este sketch.

Consulta el [README principal](../../README.md) para alimentación, modo de carga, configuración del backend y pruebas.

## Compilación y carga con Arduino CLI

Verificado con Arduino-ESP32 **2.0.17**. Usa una carpeta temporal sin espacios para evitar un fallo de las recetas de compilación de esa versión:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32cam --build-path /tmp/loro-esp32cam-build firmware/esp32cam_web
arduino-cli upload --fqbn esp32:esp32:esp32cam --upload-property upload.speed=115200 --port /dev/cu.usbserial-110 --input-dir /tmp/loro-esp32cam-build firmware/esp32cam_web
```

Ejecuta desde la raíz y sustituye el puerto según tu equipo. Algunas versiones no muestran un menú de velocidad para AI Thinker; `--upload-property upload.speed=115200` fija explícitamente la velocidad de carga.
