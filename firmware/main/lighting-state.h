#pragma once
#include <stdint.h>

enum class LightWarning : uint8_t { None, Empty, Blocked };

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

inline uint8_t celebrationStep(uint32_t elapsed, uint32_t duration) {
  return elapsed * 9 / duration;
}

inline uint8_t celebrationLed(uint8_t step) {
  return step <= 4 ? step : 8 - step;
}
