/* Proyecto Loro - AI Thinker ESP32-CAM / OV2640.
 * Red abierta linksys. GET /capture devuelve una foto JPEG bajo demanda.
 * Placa Arduino IDE: AI Thinker ESP32-CAM. Monitor: 115200 baudios.
 * No comparte pines ni sketch con el ESP32 de sensores.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "esp_camera.h"

constexpr char WIFI_SSID[] = "linksys";
constexpr char HOSTNAME[] = "esp32cam";
WebServer server(80);
bool cameraReady = false;
bool networkReady = false;
uint32_t lastReconnect = 0;

const char HOME[] PROGMEM = R"HTML(<!doctype html>
<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proyecto Loro · Cámara</title><style>body{font:16px system-ui;max-width:800px;margin:40px auto;padding:20px}button{font:inherit;padding:12px 20px}img{display:block;max-width:100%;margin-top:20px}</style>
<h1>Proyecto Loro</h1><p>ESP32-CAM · Fotografía bajo demanda</p>
<button id="take">Tomar foto</button><p id="status" role="status">No se ha solicitado una foto.</p><img id="photo" alt="Foto capturada" hidden>
<script>let url;document.querySelector('#take').onclick=async()=>{let b=document.querySelector('#take'),s=document.querySelector('#status');b.disabled=true;s.textContent='Tomando foto…';try{let r=await fetch('/capture',{cache:'no-store'});if(!r.ok)throw Error('No se pudo capturar la imagen');let next=URL.createObjectURL(await r.blob());let i=document.querySelector('#photo');i.src=next;i.hidden=false;if(url)URL.revokeObjectURL(url);url=next;s.textContent='Foto recibida.';}catch(e){s.textContent=e.message;}finally{b.disabled=false;}};</script></html>)HTML";

bool initCamera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  // Pinout oficial AI Thinker.
  config.pin_d0 = 5; config.pin_d1 = 18;
  config.pin_d2 = 19; config.pin_d3 = 21;
  config.pin_d4 = 36; config.pin_d5 = 39;
  config.pin_d6 = 34; config.pin_d7 = 35;
  config.pin_xclk = 0;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sccb_sda = 26;
  config.pin_sccb_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = psramFound() ? FRAMESIZE_SVGA : FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  // Un único buffer para descartar la imagen retenida antes de una nueva captura.
  config.fb_count = 1;
  config.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  esp_err_t error = esp_camera_init(&config);
  if (error != ESP_OK) {
    Serial.printf("Error al iniciar OV2640: 0x%x. Revisa flex y alimentacion.\n", error);
    return false;
  }
  Serial.println("OV2640 iniciada.");
  return true;
}

void capturePhoto() {
  if (!cameraReady) {
    server.send(503, "text/plain", "Camara no disponible; revisa el monitor serie.");
    return;
  }
  // Descartar el buffer anterior: la foto entregada debe adquirirse tras la petición.
  camera_fb_t *old = esp_camera_fb_get();
  if (old) esp_camera_fb_return(old);
  camera_fb_t *frame = esp_camera_fb_get();
  if (!frame) {
    server.send(503, "text/plain", "No fue posible adquirir la foto.");
    return;
  }
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(frame->len);
  server.send(200, "image/jpeg", "");
  WiFiClient client = server.client();
  client.setTimeout(5);
  const size_t sent = client.write(frame->buf, frame->len);
  Serial.printf("Foto: %u/%u bytes enviados\n", (unsigned)sent, (unsigned)frame->len);
  esp_camera_fb_return(frame);
}

void setup() {
  Serial.begin(115200);
  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);  // Flash apagado.
  cameraReady = initCamera();
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(HOSTNAME);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID);  // Red sin contraseña.
  Serial.printf("Conectando a red abierta %s...\n", WIFI_SSID);
  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html; charset=utf-8", HOME); });
  server.on("/capture", HTTP_GET, capturePhoto);
  server.on("/health", HTTP_GET, []() {
    server.send(cameraReady ? 200 : 503, "application/json",
                cameraReady ? "{\"camera_ready\":true}" : "{\"camera_ready\":false}");
  });
  server.onNotFound([]() { server.send(404, "text/plain", "Ruta no encontrada"); });
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!networkReady) {
      if (MDNS.begin(HOSTNAME)) MDNS.addService("http", "tcp", 80);
      else Serial.println("mDNS no disponible; usa la IP.");
      server.begin();
      networkReady = true;
      Serial.printf("Camara web: http://%s/ | http://%s.local/\n", WiFi.localIP().toString().c_str(), HOSTNAME);
    }
    server.handleClient();
  } else {
    if (networkReady) {
      server.stop();
      MDNS.end();
      networkReady = false;
      Serial.println("Wi-Fi desconectado.");
    }
    if ((uint32_t)(millis() - lastReconnect) >= 10000) {
      lastReconnect = millis();
      Serial.printf("Reintentando conexion a %s...\n", WIFI_SSID);
      WiFi.reconnect();
    }
  }
  delay(2);
}
