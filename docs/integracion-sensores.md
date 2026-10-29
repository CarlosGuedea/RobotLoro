# Integración de sensores

Petición: conectar el ESP32 existente de DHT22 y sonido al backend y frontend de Proyecto Loro.

Se mantiene el flujo HTTP local usado por la cámara. El ESP32 de sensores se conecta a `linksys` sin contraseña, publica `/readings` por HTTP y se anuncia como `esp32sensores.local`. Conserva DATA del DHT22 en GPIO27 y OUT del sensor de sonido en GPIO26, activo LOW configurable. Muestra cada muestra por USB a 115200.

El backend agrega `GET /api/sensors`, valida el JSON y devuelve la muestra con su antigüedad y fecha de recepción. Dirección configurable con `--sensors-url` / `SENSORS_URL`. El frontend consulta cada tres segundos, sin solicitudes superpuestas, y muestra temperatura, humedad y detección digital. Un fallo DHT se representa con null; desconexión o muestra de más de diez segundos se muestran explícitamente sin valores actuales.

La cámara conserva su captura bajo demanda. No se incorpora historial, grabación ni IA. Se elige consulta HTTP por consistencia con la cámara y para no depender de USB; no hace falta añadir MQTT ni fijar la IP del ordenador en el firmware.

## Plan y verificación

1. Pruebas del endpoint: lectura válida, fallo DHT, JSON inválido, valores fuera de rango y placa inaccesible.
2. Firmware Wi-Fi con muestras cada 2.5 segundos, errores explícitos y reconexión.
3. Backend y frontend con estados inicial, actualizado, atrasado, fallo DHT y desconexión.
4. Compilar y cargar solo en el puerto de la placa de sensores, a 115200. Comprobar lecturas reales y que la captura de cámara siga funcionando.

La revisión detectó que una ventana positiva de 2.5 s podía sobrescribirse entre consultas de 3 s. Se agregó `sound_activity_count`: contador acumulado de ventanas positivas que el frontend compara por dispositivo/reinicio. Esto conserva actividad captada entre consultas sin convertirla en un conteo de palmadas. Verificado con una prueba que falló antes del arreglo y pasa después.

Verificación final: 16 pruebas del backend y 4 del frontend correctas. Firmware cargado a 115200 y muestra real recibida desde 192.168.1.130. Se resolvió el retraso de mDNS usando IPv4 para las consultas de sensores.
