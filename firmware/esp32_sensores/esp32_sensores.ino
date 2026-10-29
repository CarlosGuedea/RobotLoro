/* Proyecto Loro - ESP32 DevKit / ESP32-WROOM clasico.
 * DHT22 DATA -> GPIO27 (pull-up 10 kOhm a 3V3 si hace falta).
 * Sonido de 3 pines OUT -> GPIO26. Ambos: 3V3 y GND comun.
 * Wi-Fi abierto linksys. GET /readings entrega la ultima muestra.
 * Monitor serie y carga: 115200. Sonido digital; no mide decibeles.
 */
#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

constexpr uint8_t PIN_DHT = 27;
constexpr uint8_t PIN_SONIDO_DIGITAL = 26;
constexpr uint8_t NIVEL_SONIDO_ACTIVO = LOW;  // Cambiar a HIGH si tu modulo lo requiere.
constexpr uint32_t INTERVALO_REPORTE_MS = 2500;
constexpr char WIFI_SSID[] = "linksys";
constexpr char HOSTNAME[] = "esp32sensores";
DHT dht(PIN_DHT, DHT22);
WebServer server(80);

uint32_t ultimoReporteMs = 0;
uint32_t muestraMs = 0;
uint32_t ultimoReintentoMs = 0;
uint32_t actividadSonido = 0;
bool umbralDetectado = false;
bool sonidoMuestra = false;
bool hayMuestra = false;
bool dhtValido = false;
bool redLista = false;
int nivelMuestra = HIGH;
float temperatura = NAN;
float humedad = NAN;

String readingsJson() {
  String json;
  json.reserve(260);
  json = "{\"temperature_c\":";
  json += dhtValido ? String(temperatura, 1) : "null";
  json += ",\"humidity_pct\":";
  json += dhtValido ? String(humedad, 1) : "null";
  json += ",\"dht_ok\":";
  json += dhtValido ? "true" : "false";
  json += ",\"sound_detected\":";
  json += sonidoMuestra ? "true" : "false";
  json += ",\"sound_level\":";
  json += nivelMuestra;
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
  pinMode(PIN_SONIDO_DIGITAL, INPUT);
  dht.begin();
  ultimoReporteMs = millis();
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(HOSTNAME);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID);  // Red abierta: sin contrasena.
  server.on("/", HTTP_GET, sendReadings);
  server.on("/readings", HTTP_GET, sendReadings);
  server.onNotFound([]() { server.send(404, "application/json", "{\"error\":\"Ruta no encontrada\"}"); });
  Serial.println("Proyecto Loro: ESP32 de sensores, DHT22 GPIO27 y sonido GPIO26");
  Serial.printf("Conectando a %s. Primera muestra en 2.5 segundos.\n", WIFI_SSID);
}

void loop() {
  const int nivel = digitalRead(PIN_SONIDO_DIGITAL);
  if (nivel == NIVEL_SONIDO_ACTIVO) umbralDetectado = true;
  const uint32_t ahora = millis();
  if ((uint32_t)(ahora - ultimoReporteMs) >= INTERVALO_REPORTE_MS) {
    ultimoReporteMs = ahora;
    humedad = dht.readHumidity();
    temperatura = dht.readTemperature();
    dhtValido = isfinite(humedad) && isfinite(temperatura)
                && humedad >= 0 && humedad <= 100 && temperatura >= -40 && temperatura <= 80;
    sonidoMuestra = umbralDetectado;
    if (sonidoMuestra) ++actividadSonido;
    nivelMuestra = nivel;
    umbralDetectado = false;
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
