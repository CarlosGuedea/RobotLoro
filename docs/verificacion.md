# Verificación — 29 de octubre de 2026

- Firmware AI Thinker compilado con Arduino-ESP32 2.0.17: 872057 bytes de programa, 51540 bytes de variables globales.
- Cargado en `/dev/cu.usbserial-110` a **115200 baudios**, hashes de escritura verificados.
- Monitor serie: `OV2640 iniciada`, red abierta **linksys**, IP observada **192.168.1.129**. La IP puede cambiar por DHCP.
- `GET http://192.168.1.129/health`: `{"camera_ready":true}`.
- Captura real mediante `POST http://localhost:8000/api/capture`: HTTP 200, JPEG de 800 × 600, 20689 bytes.
- Botón **Tomar foto** probado en navegador contra la cámara física: segunda fotografía recibida, 20337 bytes, nueva fecha y vista actualizada; consola sin errores.
- Pruebas Python: **9/9 correctas** (`python3 -m unittest discover -s backend/tests -v`). Cubren falta de imagen inicial, captura, conservación ante error, desconexión, JPEG inválido/truncado, MIME incorrecto, tamaño máximo y rutas.
- Interfaz revisada con cámara simulada en escritorio, tableta y móvil; prueba de error conserva la imagen anterior y permite reintentar. El inspector automático de estilo no completó la navegación; se utilizó revisión visual y navegador real.
- Revisión de código independiente sin hallazgos bloqueantes. Se corrigieron dos detalles de inicio/estado: solicitudes iniciales con timeout e indicador del servidor actualizado ante errores de red.

El firmware del ESP32 de sensores solo se trasladó a `firmware/esp32_sensores/`. No se volvió a cargar ni probar su hardware durante esta integración.

## Integración posterior del ESP32 de sensores

- Firmware de sensores compilado: 786469 bytes de programa y 47000 bytes de variables globales; carga a 115200 en `/dev/cu.usbserial-10`, MAC `6c:c8:40:92:27:20`, escritura verificada. Fue necesario usar BOOT y reiniciar por USB tras una interrupción de carga.
- Red abierta linksys, dirección observada `192.168.1.130`, nombre `esp32sensores.local`.
- DHT22 entrega lecturas válidas después de reconectar su cable. Lecturas reales vistas en el frontend: 30.0 °C, 43.4 % de humedad y sonido sin detección; también se observaron cambios de actividad de sonido.
- `GET /api/sensors` verificado con JSON real y contador de ventanas de actividad. Se corrigió la pérdida de detecciones entre consultas mediante el contador acumulado, cubierto por pruebas.
- Se midió una demora mDNS de 5.1 s por resolución dual, que hacía vencer el timeout del navegador. La consulta de sensores ahora resuelve los nombres .local por IPv4: alrededor de 0.03–0.1 s en esta red. Prueba de regresión incluida.
- Suite final: 16 pruebas Python y 4 de frontend Node correctas. Estado DHT sin lectura verificado también en navegador; las pruebas cubren desconexión, muestras atrasadas y reinicio de placa.
- Cámara física y captura bajo demanda verificadas durante la integración. La alimentación por USB puede mantenerse o sustituirse por una fuente adecuada: la comunicación del proyecto usa Wi-Fi.
