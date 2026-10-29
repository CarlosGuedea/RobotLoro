#pragma once
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <climits>

struct AudioMetrics {
  bool valid = false;
  double rms = 0;
  double dbfs = -120;
  bool clipped = false;
  int32_t minPcm = 0;
  int32_t maxPcm = 0;
};

struct AudioSnapshot {
  bool ok;
  float rms;
  float dbfs;
  float peakDbfs;
  bool detected;
  bool clipped;
  uint32_t ageMs;
};

inline AudioSnapshot makeAudioSnapshot(const AudioMetrics &metrics, uint32_t age,
                                       bool detected, bool clipped, float peak) {
  AudioSnapshot result = {};
  result.ok = metrics.valid && age <= 500;
  result.rms = metrics.rms;
  result.dbfs = metrics.dbfs;
  result.peakDbfs = peak;
  // El evento pertenece al período; una avería posterior no lo borra.
  result.detected = detected;
  result.clipped = clipped;
  result.ageMs = age;
  return result;
}

// INMP441: PCM de 24 bits en los bits superiores de una palabra I2S de 32.
class AudioAccumulator {
 public:
  void add(int32_t raw) {
    const int32_t pcm = raw >> 8;
    const double value = static_cast<double>(pcm) / 8388608.0;
    sum += value;
    squares += value * value;
    if (pcm < minimum) minimum = pcm;
    if (pcm > maximum) maximum = pcm;
    if (std::abs(value) >= 0.999) clipped = true;
    ++count;
  }
  AudioMetrics finish() const {
    AudioMetrics result;
    result.valid = count > 1 && minimum != maximum;
    result.clipped = clipped;
    result.minPcm = count ? minimum : 0;
    result.maxPcm = count ? maximum : 0;
    if (!result.valid) return result;
    const double mean = sum / count;
    const double variance = squares / count - mean * mean;
    result.rms = std::sqrt(variance > 0 ? variance : 0);
    result.dbfs = result.rms > 0.000001 ? 20.0 * std::log10(result.rms) : -120.0;
    return result;
  }
  size_t size() const { return count; }
  void reset() { *this = AudioAccumulator(); }

 private:
  size_t count = 0;
  double sum = 0;
  double squares = 0;
  int32_t minimum = INT32_MAX;
  int32_t maximum = INT32_MIN;
  bool clipped = false;
};
