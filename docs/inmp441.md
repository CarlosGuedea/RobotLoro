# Cambio a INMP441

Sustituir el detector digital KY-038 por un micrófono INMP441 I2S, manteniendo DHT22, Wi-Fi linksys y arquitectura HTTP.

Pines confirmados por el mapa compartido por el usuario: SCK GPIO26, WS GPIO25, SD GPIO33, L/R GND, VDD 3V3 y GND común. DHT22 continúa en GPIO27. GPIO32 queda libre. Con Arduino-ESP32 2.0.17, la prueba física A/B mostró audio únicamente al seleccionar el slot derecho del driver (`MICROPHONE_LEFT_CHANNEL=false`); el izquierdo entregó palabras crudas 0 o 1. Se conserva el cableado confirmado y la selección derecha verificada.

Audio mono a 16000 muestras/s, con palabras de 32 bits que transportan PCM firmado de 24 bits. Ventanas de 100 ms: RMS sin componente continua, dBFS relativos al máximo digital de amplitud y bandera de saturación. Muestreo continuo en tarea separada para no detenerlo durante DHT o peticiones HTTP. Un umbral inicial de -35 dBFS es una propuesta configurable, no una medida calibrada de ruido ambiental. El contador de ventanas detectadas preserva actividad entre consultas.

Se publican `sound_source`, `sound_ok`, `sound_rms`, `sound_dbfs`, `sound_peak_dbfs`, `sound_threshold_dbfs`, `sound_clipped` y `sound_age_ms`, además de los campos existentes. Fallo o señal constante inválida: valores de audio nulos, sin sustituirlos por silencio. No hay identificación electrónica del INMP441: la recepción DMA por sí sola no prueba que esté conectado.

La web muestra nivel en dBFS, detección por umbral y error de micrófono independiente del DHT22. No se guardan ni transmiten grabaciones de voz; solo estadísticas.

Pruebas: cálculo con silencio, continua, amplitud conocida, seno y clipping; JSON válido/inválido y fallo parcial; presentación de nivel, error y conservación de eventos en frontend; compilación ESP32. La carga física y la respuesta al sonido quedaron verificadas por USB con `sound_ok:true`, niveles dBFS variables y DHT22 válido. La integración HTTP backend/frontend requiere que el ordenador tenga acceso a la red de las placas.

Referencias: [INMP441, fabricante](https://www.invensense.com/wp-content/uploads/2015/02/INMP441.pdf), [I2S ESP-IDF 4.4](https://docs.espressif.com/projects/esp-idf/en/release-v4.4/esp32/api-reference/peripherals/i2s.html).
