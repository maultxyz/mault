#include <Arduino.h>
#include <FastLED.h>

#if !defined(CONFIG_IDF_TARGET_ESP32S3)
#error "This diagnostic targets ESP32-S3 boards only."
#endif

constexpr uint8_t LED_DATA_PIN = 18;
constexpr uint16_t LED_COUNT = 5;
constexpr uint8_t LED_BRIGHTNESS = 32;
constexpr unsigned long COLOR_HOLD_MS = 2000;

CRGB leds[LED_COUNT];

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
  FastLED.setBrightness(LED_BRIGHTNESS);
  fill_solid(leds, LED_COUNT, CRGB::Black);
  FastLED.show();
}

void loop() {
  const CRGB colors[] = {CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::Black};
  const char* names[] = {"red", "green", "blue", "off"};

  for (uint8_t i = 0; i < 4; ++i) {
    fill_solid(leds, LED_COUNT, colors[i]);
    FastLED.show();
    Serial.print(F("MAULT-LED-TEST-1 GPIO=17 LEDs=5 brightness=32 color="));
    Serial.println(names[i]);
    delay(COLOR_HOLD_MS);
  }
}
