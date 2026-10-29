# Proyecto Loro: sensores en ESP32

Sketch para **ESP32 DevKit con ESP32-WROOM clasico**. Los GPIO elegidos no se aplican directamente a ESP32-C3, S3 u otras variantes. Publica las lecturas por Wi-Fi y por USB. LCD e IA quedan para una siguiente etapa.

## Conexion al backend

Se conecta a **linksys**, sin contrasena. El monitor serie muestra su IP y `http://esp32sensores.local/readings`. El backend consulta esta direccion al recibir `GET /api/sensors` del frontend, que actualiza cada 3 segundos.

Si mDNS no resuelve, inicia Python desde la raiz del proyecto con `python3 backend/server.py --sensors-url http://<IP-del-ESP32>`. Tambien puedes configurar `SENSORS_URL`. La camara usa su propia direccion y su propio ESP32.

`GET /readings` y `GET /` devuelven JSON con `temperature_c`, `humidity_pct`, `dht_ok`, `sound_detected`, `sound_level`, `sound_activity_count`, `sample_age_ms` y `uptime_ms`. Antes de la primera muestra responde 503. Un fallo DHT responde con `dht_ok: false` y valores de temperatura/humedad `null`; no reutiliza valores anteriores. El backend valida el JSON antes de mostrarlo. La interfaz retira valores de muestras de mas de 10 segundos y diferencia placa desconectada de DHT sin lectura.

## Conexiones

Desconecta la alimentacion antes de cablear. Usa las etiquetas impresas del modulo para identificar sus terminales.

| Sensor | Terminal | ESP32 |
| --- | --- | --- |
| DHT22 | VCC / + | 3V3 |
| DHT22 | GND / - | GND |
| DHT22 | DATA / OUT | GPIO27 |
| Sonido (3 pines) | VCC | 3V3 |
| Sonido (3 pines) | GND | GND |
| Sonido (3 pines) | OUT | GPIO26 |

Adaptado al modulo de la fotografia, con VCC, GND y OUT. Por su circuito con ajuste de umbral, se trata OUT como salida digital; la fotografia no permite confirmar el modelo exacto ni la polaridad activa. GPIO34 queda libre.

Para el DHT22 sin placa adaptadora, con la rejilla de frente y las patas hacia abajo: 1 VCC, 2 DATA, 3 sin conectar, 4 GND. Agrega una resistencia de 10 kOhm entre DATA y 3V3 si no tiene pull-up integrado. Comprueba el pinout de tu modelo antes de conectarlo.

Alimenta el sensor de sonido a 3.3 V y verifica que tu variante admita esa tension. No conectes una salida de 5 V a un GPIO del ESP32. Todos los componentes deben compartir GND.

## Arduino IDE

1. Instala el paquete **esp32 by Espressif Systems** desde el gestor de placas si falta.
2. Desde el gestor de bibliotecas instala **DHT sensor library by Adafruit** y acepta sus dependencias, incluida **Adafruit Unified Sensor**.
3. Abre `esp32_sensores.ino` manteniendolo dentro de la carpeta `esp32_sensores`.
4. Selecciona **ESP32 Dev Module** para un ESP32-WROOM DevKit compatible y el puerto USB de tu placa.
5. Verifica, carga y abre el monitor serie a **115200 baudios**.

## Lecturas

Cada 2.5 segundos se genera una muestra JSON con temperatura en Celsius, humedad relativa, estado de OUT al inicio del reporte (0 o 1) y si se observo el nivel activo durante ese intervalo. Se imprime por USB y queda disponible por HTTP. Un fallo del DHT22 se informa sin detener las lecturas de sonido ni presentar datos anteriores como actuales.

OUT se lee como senal digital: **no mide intensidad ni decibeles**. El potenciometro ajusta el umbral. El sketch asume LOW como nivel activo; si al probar observas OUT=0 en silencio y OUT=1 al detectar ruido, cambia `NIVEL_SONIDO_ACTIVO` a `HIGH`. Ajusta primero el potenciometro para que OUT permanezca estable en silencio y despues prueba con palmadas. Usa tambien el LED indicador de deteccion del modulo como referencia.

El muestreo es basico, con pausas durante la lectura DHT y la impresion serie: puede perder pulsos breves. El indicador SI significa que se observo el nivel activo al menos una vez en el intervalo; no cuenta palmadas ni graba audio. Si OUT no cambia con el sonido, revisa el ajuste del potenciometro y las conexiones. Esta version requiere una prueba fisica para confirmar el comportamiento del modulo de la foto.

## Referencias

- [Referencia de comparador y umbral en sensores de sonido KY-038](https://sensorkit.joy-it.net/en/sensors/ky-038) (referencia de funcionamiento; no identifica el modelo de la foto).
- [Conexion y uso de DHT22, Adafruit](https://learn.adafruit.com/dht?view=all)

`sound_activity_count` acumula ventanas de muestreo con sonido detectado, no palmadas. El frontend compara el contador entre consultas para conservar detecciones aunque una muestra positiva haya sido reemplazada. No recupera pulsos que el muestreo fisico no detecto; tras una desconexion o reinicio no presenta actividad antigua como nueva.
