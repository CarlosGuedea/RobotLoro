# ESP32 con DHT22 e INMP441

Firmware para ESP32 DevKit / ESP32-WROOM clásico. Conserva DHT22 y sustituye el KY-038 por un micrófono digital INMP441. La cámara utiliza otra placa y otro sketch.

## Conexiones confirmadas

| Sensor | Pin | ESP32 |
| --- | --- | --- |
| INMP441 | VDD | 3V3 |
| INMP441 | GND | GND |
| INMP441 | SCK / BCLK | GPIO26 |
| INMP441 | WS / LRCLK | GPIO25 |
| INMP441 | SD | GPIO33 |
| INMP441 | L/R | GND (montaje confirmado; ver selección de slot abajo) |
| DHT22 | VCC | 3V3 |
| DHT22 | GND | GND |
| DHT22 | DATA | GPIO27 |

Usa GND común. No alimentes el INMP441 a 5 V. Si el DHT22 no tiene pull-up, agrega 10 kΩ entre DATA y 3V3. Si el módulo expone CHIPEN, debe estar a VDD; normalmente la placa ya lo conecta.

Los pines, canal y umbral se configuran en `microphone.h`. El montaje verificado usa **L/R a GND y `MICROPHONE_LEFT_CHANNEL=false`**: con Arduino-ESP32 2.0.17, el audio respondió en el slot derecho del driver, mientras el izquierdo entregó palabras crudas 0 o 1. No cambies simultáneamente el cableado y la constante; si modificas el montaje, comprueba el canal con una captura real. No dejes L/R flotante. Se habilita pull-down en SD para los períodos en que el micrófono deja la línea en alta impedancia; la ficha recomienda una resistencia externa de 100 kΩ si el módulo no la incorpora.

## Cómo son las lecturas

El INMP441 entrega **PCM de 24 bits con signo por I²S**, almacenado aquí en palabras de 32 bits. Una muestra instantánea representa amplitud de la onda, con valores PCM entre -8388608 y 8388607. No es una lectura analógica de `analogRead` ni una salida binaria de umbral.

Se toman 16000 muestras por segundo. Cada ventana de 100 ms calcula RMS con la componente continua eliminada; el audio se procesa en una tarea independiente. Cada 2.5 segundos se publica temperatura, humedad y las estadísticas de audio. No se envían ni guardan grabaciones.

| Campo | Significado |
| --- | --- |
| `sound_rms` | RMS normalizado, entre 0 y 1 |
| `sound_dbfs` | Nivel RMS digital de la última ventana de 100 ms |
| `sound_peak_dbfs` | Mayor nivel RMS de 100 ms observado desde el reporte anterior; no es el pico instantáneo de una muestra |
| `sound_threshold_dbfs` | Umbral de detección configurado; inicialmente -35 dBFS |
| `sound_detected` | Alguna ventana del período superó el umbral |
| `sound_activity_count` | Contador acumulado de períodos con detección, para no perder actividad entre consultas; no cuenta palmadas |
| `sound_clipped` | Se observaron muestras muy cercanas al límite digital |
| `sound_ok` | Se recibió audio reciente con variación; no equivale a identificación electrónica del dispositivo |
| `sound_age_ms` | Antigüedad de la lectura de audio publicada |

Convención usada: `dBFS = 20 * log10(RMS normalizado)`, relativo a la amplitud digital máxima, con piso de visualización de -120 dBFS. Por ejemplo:

- RMS 0.001 → -60 dBFS.
- RMS 0.01 → -40 dBFS.
- RMS 0.1 → -20 dBFS.

Valores más cercanos a cero representan más señal. Con esta referencia un seno de amplitud máxima tiene RMS 0.7071 y nivel -3.01 dBFS. La sensibilidad de una ficha técnica puede utilizar una referencia de seno distinta; no sumes una constante arbitraria para estimar presión sonora.

**dBFS no es dB SPL ni dBA.** Para umbrales de ruido ambiental calibrados necesitas comparar contra un sonómetro o calibrador y definir la ponderación y ventana de medida. Aquí -35 dBFS es un punto inicial configurable, no un límite ambiental recomendado. Observa silencio, voz y palmadas en tu montaje antes de ajustar `SOUND_THRESHOLD_DBFS`.

Si I²S falla, la señal es constante o deja de llegar, las métricas se publican como `null` y la web muestra “Sin señal de audio”, manteniendo las lecturas del DHT22. Un error del DHT22 solo anula temperatura y humedad. Sin comunicación digital de identificación, el firmware no puede distinguir todos los fallos físicos de un micrófono desconectado.

## Arduino IDE y Wi-Fi

1. Instala **esp32 by Espressif Systems** y **DHT sensor library by Adafruit**, con sus dependencias.
2. Abre `esp32_sensores.ino` manteniendo los archivos `.h` y `.cpp` en la misma carpeta.
3. Selecciona **ESP32 Dev Module**, el puerto correcto y carga a **115200**. El monitor serie también usa 115200.
4. Se conecta a **linksys**, sin contraseña. Publica JSON en `/readings` y `/`, y anuncia `esp32sensores.local`.
5. Desde la raíz ejecuta `python3 backend/server.py`. Si mDNS falla, usa `--sensors-url http://<IP-de-la-placa>`.

Verificado compilando con Arduino-ESP32 **2.0.17**, usando el controlador I²S legacy incluido. El driver genera dos slots físicos de 32 bits (64 ciclos de SCK por WS) aunque se reciba solo un canal; este montaje respondió en el derecho. La compatibilidad de otras versiones debe comprobarse antes de migrar el paquete.

## Pruebas del cálculo

Desde la raíz:

```bash
c++ -std=c++11 firmware/tests/audio_metrics_test.cpp -o /tmp/loro-audio-test
/tmp/loro-audio-test
python3 -m unittest discover -s backend/tests -v
node --test frontend/tests/sensors.test.cjs
```

Estas pruebas validan cálculos y software; no sustituyen la comprobación de la señal con el micrófono conectado.

## Referencias

- [Ficha INMP441, TDK/InvenSense](https://www.invensense.com/wp-content/uploads/2015/02/INMP441.pdf).
- [I²S ESP-IDF 4.4](https://docs.espressif.com/projects/esp-idf/en/release-v4.4/esp32/api-reference/peripherals/i2s.html).
- [DHT22, Adafruit](https://learn.adafruit.com/dht?view=all).
