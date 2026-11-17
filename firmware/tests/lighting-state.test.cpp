#include "../main/lighting-state.h"
#include <assert.h>
#include <stdio.h>
#include <initializer_list>

int main() {
  assert(scaleLightChannel(255, 255) == 255);
  assert(scaleLightChannel(255, 128) == 128);
  assert(scaleLightChannel(128, 0) == 0);
  const RgbwColor whiteOnly = whiteLedColor(255);
  assert(whiteOnly.r == 0 && whiteOnly.g == 0 && whiteOnly.b == 0 && whiteOnly.w == 255);
  LightWarningCycle cycle;
  assert(cycle.update(0) == LightWarning::None);
  cycle.empty = true;
  assert(cycle.update(100) == LightWarning::Empty);
  assert(cycle.update(3099) == LightWarning::Empty);
  assert(cycle.update(3100) == LightWarning::None);
  assert(cycle.update(8099) == LightWarning::None);
  assert(cycle.update(8100) == LightWarning::Empty);
  cycle.blocked = true;
  cycle.blockedMs = 1000;
  assert(cycle.update(8200) == LightWarning::Blocked);
  assert(cycle.update(9200) == LightWarning::None);
  assert(cycle.update(14200) == LightWarning::Blocked);
  cycle.blocked = false;
  assert(cycle.update(14201) == LightWarning::Empty);
  cycle.empty = false;
  assert(cycle.update(14202) == LightWarning::None);
  cycle.empty = true;
  cycle.enabled = false;
  assert(cycle.update(14203) == LightWarning::None);
  cycle.enabled = true;
  assert(cycle.update(14204) == LightWarning::Empty);
  cycle.emptyMs = 300000;
  cycle.normalMs = 300000;
  cycle.selected = LightWarning::None;
  assert(cycle.update(20000) == LightWarning::Empty);
  assert(cycle.update(320000) == LightWarning::None);
  assert(cycle.update(620000) == LightWarning::Empty);
  cycle.emptyMs = 1000;
  cycle.normalMs = 1000;
  cycle.selected = LightWarning::None;
  assert(cycle.update(UINT32_MAX - 500) == LightWarning::Empty);
  assert(cycle.update(499) == LightWarning::None);
  assert(cycle.update(1499) == LightWarning::Empty);
  for (uint16_t count : {8u, 16u}) {
    for (uint32_t duration : {500u, 501u, 3000u}) {
      bool seen[31] = {};
      uint16_t steps = 2 * count - 1;
      for (uint32_t elapsed = 0; elapsed < duration; elapsed++) {
        uint16_t step = celebrationStep(elapsed, duration, count);
        assert(step < steps);
        assert(celebrationLed(step, count) == (step < count ? step : steps - step - 1));
        seen[step] = true;
      }
      for (uint16_t step = 0; step < steps; step++) assert(seen[step]);
    }
  }
  puts("PASS: RGBW channel scaling, warnings and 8/16 LED celebrations");
}
