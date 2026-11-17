#pragma once
#include <stdint.h>

enum class LightWarning : uint16_t { None, Empty, Blocked };

struct RgbwColor {
  uint16_t r;
  uint16_t g;
  uint16_t b;
  uint16_t w;
};

inline RgbwColor whiteLedColor(uint16_t level) {
  return {0, 0, 0, level};
}

inline uint16_t scaleLightChannel(uint16_t value, uint16_t brightness) {
  return ((uint16_t)value * brightness + 127) / 255;
}

struct LightWarningCycle {
  bool empty = false;
  bool blocked = false;
  bool enabled = true;
  uint32_t emptyMs = 3000;
  uint32_t blockedMs = 3000;
  uint32_t normalMs = 5000;
  LightWarning selected = LightWarning::None;
  uint32_t startedAt = 0;

  LightWarning update(uint32_t now) {
    LightWarning next = enabled
      ? (blocked ? LightWarning::Blocked : empty ? LightWarning::Empty : LightWarning::None)
      : LightWarning::None;
    if (next != selected) {
      selected = next;
      startedAt = now;
    }
    if (next == LightWarning::None) return next;
    uint32_t warningMs = next == LightWarning::Blocked ? blockedMs : emptyMs;
    return (uint32_t)(now - startedAt) % (warningMs + normalMs) < warningMs
      ? next : LightWarning::None;
  }
};

inline uint16_t celebrationStep(uint32_t elapsed, uint32_t duration, uint16_t count) {
  return elapsed * (2 * count - 1) / duration;
}

inline uint16_t celebrationLed(uint16_t step, uint16_t count) {
  return step < count ? step : 2 * (count - 1) - step;
}
