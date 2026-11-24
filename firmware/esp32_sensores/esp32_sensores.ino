/* Proyecto Loro - ESP32 DevKit / ESP32-WROOM clasico.
 * DHT22 DATA -> GPIO27 (pull-up 10 kOhm a 3V3 si hace falta).
 * INMP441: SCK->26, WS->25, SD->33, L/R->GND, VDD->3V3 (microphone.h).
 * Wi-Fi abierto linksys. GET /readings entrega la ultima muestra.
 * Monitor serie y carga: 115200. Audio I2S en dBFS; no es dB SPL calibrado.
 */
#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "microphone.h"

constexpr uint8_t PIN_DHT = 27;
constexpr uint32_t INTERVALO_REPORTE_MS = 2500;
constexpr char WIFI_SSID[] = "linksys";
constexpr char HOSTNAME[] = "esp32sensores";
DHT dht(PIN_DHT, DHT22);
WebServer server(80);

uint32_t ultimoReporteMs = 0;
uint32_t muestraMs = 0;
uint32_t ultimoReintentoMs = 0;
uint32_t actividadSonido = 0;
bool sonidoMuestra = false;
bool hayMuestra = false;
bool dhtValido = false;
bool redLista = false;
AudioSnapshot audio = {};
float temperatura = NAN;
float humedad = NAN;

String readingsJson() {
  String json;
  json.reserve(560);
  const uint32_t audioAge = audio.ageMs + static_cast<uint32_t>(millis() - muestraMs);
  const bool audioOk = audio.ok && audioAge <= 5000;
  json = "{\"temperature_c\":";
  json += dhtValido ? String(temperatura, 1) : "null";
  json += ",\"humidity_pct\":";
  json += dhtValido ? String(humedad, 1) : "null";
  json += ",\"dht_ok\":";
  json += dhtValido ? "true" : "false";
  json += ",\"sound_detected\":";
  json += (audioOk && sonidoMuestra) ? "true" : "false";
  json += ",\"sound_source\":\"inmp441\",\"sound_level\":null,\"sound_ok\":";
  json += audioOk ? "true" : "false";
  json += ",\"sound_rms\":";
  json += audioOk ? String(audio.rms, 8) : "null";
  json += ",\"sound_dbfs\":";
  json += audioOk ? String(audio.dbfs, 1) : "null";
  json += ",\"sound_peak_dbfs\":";
  json += audioOk ? String(audio.peakDbfs, 1) : "null";
  json += ",\"sound_threshold_dbfs\":";
  json += String(SOUND_THRESHOLD_DBFS, 1);
  json += ",\"sound_clipped\":";
  json += (audioOk && audio.clipped) ? "true" : "false";
  json += ",\"sound_age_ms\":";
  json += audioAge;
  json += ",\"sound_activity_count\":";
  json += actividadSonido;
  json += ",\"sample_age_ms\":";
  json += (uint32_t)(millis() - muestraMs);
  json += ",\"uptime_ms\":";
  json += millis();
  json += "}";
  return json;
}

void sendReadings() {
  server.sendHeader("Cache-Control", "no-store");
  if (!hayMuestra) {
    server.send(503, "application/json", "{\"error\":\"Esperando la primera muestra\"}");
    return;
  }
  server.send(200, "application/json", readingsJson());
}

void setup() {
  Serial.begin(115200);
  if (!beginMicrophone()) Serial.println("INMP441: fallo de inicializacion I2S.");
  dht.begin();
  ultimoReporteMs = millis();
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(HOSTNAME);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID);  // Red abierta: sin contrasena.
  server.on("/", HTTP_GET, sendReadings);
  server.on("/readings", HTTP_GET, sendReadings);
  server.onNotFound([]() { server.send(404, "application/json", "{\"error\":\"Ruta no encontrada\"}"); });
  Serial.println("Proyecto Loro: ESP32 de sensores, DHT22 GPIO27 e INMP441 I2S");
  Serial.printf("Conectando a %s. Primera muestra en 2.5 segundos.\n", WIFI_SSID);
}

void loop() {
  const uint32_t ahora = millis();
  if ((uint32_t)(ahora - ultimoReporteMs) >= INTERVALO_REPORTE_MS) {
    ultimoReporteMs = ahora;
    humedad = dht.readHumidity();
    temperatura = dht.readTemperature();
    dhtValido = isfinite(humedad) && isfinite(temperatura)
                && humedad >= 0 && humedad <= 100 && temperatura >= -40 && temperatura <= 80;
    audio = takeAudioSnapshot();
    sonidoMuestra = audio.detected;
    if (sonidoMuestra) ++actividadSonido;
    muestraMs = millis();
    hayMuestra = true;
    Serial.println(readingsJson());
  }

  if (WiFi.status() == WL_CONNECTED) {
    if (!redLista) {
      if (MDNS.begin(HOSTNAME)) MDNS.addService("http", "tcp", 80);
      else Serial.println("mDNS no disponible; usa la IP.");
      server.begin();
      redLista = true;
      Serial.printf("Sensores: http://%s/readings | http://%s.local/readings\n",
                    WiFi.localIP().toString().c_str(), HOSTNAME);
    }
    server.handleClient();
  } else {
    if (redLista) {
      server.stop();
      MDNS.end();
      redLista = false;
      Serial.println("Wi-Fi desconectado.");
    }
    if ((uint32_t)(millis() - ultimoReintentoMs) >= 10000) {
      ultimoReintentoMs = millis();
      WiFi.reconnect();
      Serial.printf("Reintentando conexion a %s...\n", WIFI_SSID);
    }
  }
  delay(1);
}
