#include "../esp32_sensores/audio_metrics.h"
#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>

int main() {
  AudioAccumulator acc;
  for (int i = 0; i < 1600; ++i) acc.add(0);
  assert(!acc.finish().valid);
  acc.reset();
  for (int i = 0; i < 1600; ++i) acc.add(536870912); // DC = 0.25.
  assert(!acc.finish().valid);
  acc.reset();
  for (int i = 0; i < 1600; ++i) acc.add(i % 2 ? 1073741824 : -1073741824);
  auto square = acc.finish();
  assert(square.valid);
  assert(std::abs(square.rms - 0.5) < 0.000001);
  assert(std::abs(square.dbfs + 6.0206) < 0.001);
  assert(!square.clipped);
  acc.reset();
  for (int i = 0; i < 1600; ++i) {
    const double x = 0.5 * std::sin(2.0 * 3.141592653589793 * i / 16.0);
    acc.add(static_cast<int32_t>(x * 2147483648.0));
  }
  assert(std::abs(acc.finish().dbfs + 9.0309) < 0.002);
  acc.reset();
  acc.add(INT32_MIN);
  acc.add(2147483392); // Máximo PCM de 24 bits alineado a la izquierda.
  assert(acc.finish().clipped);
  AudioMetrics failed;
  auto eventBeforeFailure = makeAudioSnapshot(failed, 50, true, false, -20);
  assert(!eventBeforeFailure.ok);
  assert(eventBeforeFailure.detected); // Una avería posterior no borra el evento histórico.
  std::cout << "Audio: silencio, continua, RMS, seno y saturacion correctos\n";
}
