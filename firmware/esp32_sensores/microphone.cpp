#include "microphone.h"
#include "audio_metrics.h"
#include <driver/i2s.h>
#include <driver/gpio.h>

namespace {
constexpr i2s_port_t PORT = I2S_NUM_0;
constexpr size_t WINDOW_SAMPLES = AUDIO_SAMPLE_RATE / 10; // 100 ms.
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
AudioMetrics latest;
uint32_t latestMs = 0;
float periodPeak = -120;
bool periodDetected = false;
bool periodClipped = false;

void captureAudio(void *) {
  int32_t buffer[256];
  AudioAccumulator accumulator;
  uint32_t lastDiagnostic = 0;
  vTaskDelay(pdMS_TO_TICKS(400)); // Arranque del micrófono y sus filtros.
  for (;;) {
    size_t bytes = 0;
    const esp_err_t error = i2s_read(PORT, buffer, sizeof(buffer), &bytes, pdMS_TO_TICKS(50));
    if (error != ESP_OK || bytes == 0) {
      portENTER_CRITICAL(&mux);
      latest.valid = false;
      portEXIT_CRITICAL(&mux);
      accumulator.reset();
      vTaskDelay(pdMS_TO_TICKS(10));
      continue;
    }
    for (size_t i = 0; i < bytes / sizeof(int32_t); ++i) {
      accumulator.add(buffer[i]);
      if (accumulator.size() < WINDOW_SAMPLES) continue;
      const AudioMetrics metrics = accumulator.finish();
      accumulator.reset();
      const uint32_t now = millis();
      portENTER_CRITICAL(&mux);
      latest = metrics;
      latestMs = now;
      if (metrics.valid) {
        if (metrics.dbfs > periodPeak) periodPeak = metrics.dbfs;
        periodDetected |= metrics.dbfs >= SOUND_THRESHOLD_DBFS;
        periodClipped |= metrics.clipped;
      }
      portEXIT_CRITICAL(&mux);
      if (!metrics.valid && static_cast<uint32_t>(now - lastDiagnostic) >= 5000) {
        lastDiagnostic = now;
        Serial.printf("INMP441 sin variacion PCM: min=%ld max=%ld. Revisar SD, VDD, GND y L/R.\n",
                      static_cast<long>(metrics.minPcm), static_cast<long>(metrics.maxPcm));
        Serial.print("INMP441 raw:");
        for (size_t j = 0; j < 8 && j < i; ++j) {
          Serial.printf(" %08lx", static_cast<unsigned long>(buffer[j]));
        }
        Serial.println();
      }
    }
  }
}
} // namespace

bool beginMicrophone() {
  i2s_config_t config = {};
  config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_RX);
  config.sample_rate = AUDIO_SAMPLE_RATE;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  config.channel_format = MICROPHONE_LEFT_CHANNEL ? I2S_CHANNEL_FMT_ONLY_LEFT : I2S_CHANNEL_FMT_ONLY_RIGHT;
  // El driver ESP-IDF 4.4 conserva dos slots físicos de 32 bits: SCK=64*WS.
  config.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = 256;
  config.use_apll = false;
  esp_err_t error = i2s_driver_install(PORT, &config, 0, nullptr);
  if (error != ESP_OK) {
    Serial.printf("Error I2S install: %d\n", error);
    return false;
  }
  i2s_pin_config_t pins = {};
  pins.mck_io_num = I2S_PIN_NO_CHANGE;
  pins.bck_io_num = PIN_I2S_SCK;
  pins.ws_io_num = PIN_I2S_WS;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = PIN_I2S_SD;
  error = i2s_set_pin(PORT, &pins);
  gpio_pulldown_en(static_cast<gpio_num_t>(PIN_I2S_SD));
  if (error != ESP_OK || xTaskCreatePinnedToCore(captureAudio, "inmp441", 4096, nullptr, 1, nullptr, 0) != pdPASS) {
    Serial.printf("No se pudo iniciar captura I2S: %d\n", error);
    i2s_driver_uninstall(PORT);
    return false;
  }
  return true;
}

AudioSnapshot takeAudioSnapshot() {
  AudioSnapshot result = {};
  AudioMetrics metrics;
  uint32_t capturedMs;
  portENTER_CRITICAL(&mux);
  metrics = latest;
  result.ok = latest.valid;
  result.rms = latest.rms;
  result.dbfs = latest.dbfs;
  result.peakDbfs = periodPeak;
  result.detected = periodDetected;
  result.clipped = periodClipped;
  capturedMs = latestMs;
  periodPeak = -120;
  periodDetected = false;
  periodClipped = false;
  portEXIT_CRITICAL(&mux);
  result.ageMs = static_cast<uint32_t>(millis() - capturedMs);
  return makeAudioSnapshot(metrics, result.ageMs, result.detected, result.clipped, result.peakDbfs);
}
