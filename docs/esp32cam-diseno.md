# Captura bajo demanda — Proyecto Loro

## Actualización solicitada por el usuario (29 de octubre)

El usuario sustituye la propuesta original por capturas bajo demanda: frontend con botón **Tomar foto**, backend Python que consulta `GET /capture` de la cámara y devuelve JPEG al navegador. No se capturan fotos automáticamente. Carpetas: `frontend/`, `backend/`, `firmware/esp32_sensores/`, `firmware/esp32cam_web/`.

AI Thinker/OV2640, red abierta `linksys`, mDNS `esp32cam.local`. Backend local configurable mediante `--camera-url`, sirve los archivos del frontend y conserva solo la última foto en memoria. Endpoints: `POST /api/capture`, `GET /api/latest.jpg`, `GET /api/status`. Límites de tamaño y tiempo de espera; un fallo conserva la foto anterior. HTML/CSS/JS y Python con Pillow para validar las imágenes. Sin IA ni historial persistente todavía.


La captura bajo demanda reemplaza la propuesta de envío automático cada dos segundos. El flujo frontend → backend → cámara permite incorporar el modelo de IA en Python posteriormente.
