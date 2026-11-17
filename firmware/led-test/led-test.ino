#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

#if !defined(CONFIG_IDF_TARGET_ESP32S3)
#error "This diagnostic targets ESP32-S3 boards only."
#endif

constexpr uint16_t LED_DATA_PIN = 14;
constexpr uint16_t LED_COUNT = 16;
constexpr uint16_t LED_BRIGHTNESS = 32;
constexpr unsigned long COLOR_HOLD_MS = 2000;

Adafruit_NeoPixel leds(LED_COUNT, LED_DATA_PIN, NEO_GRBW + NEO_KHZ800);

void setup() {
  Serial.begin(9600);
  leds.begin();
  leds.setBrightness(LED_BRIGHTNESS);
  leds.clear();
  leds.show();
}

void loop() {
  const uint16_t colors[][4] = {
    {255, 0, 0, 0}, {0, 255, 0, 0}, {0, 0, 255, 0}, {0, 0, 0, 255}, {0, 0, 0, 0},
  };
  const char* names[] = {"red", "green", "blue", "white", "off"};

  for (uint16_t i = 0; i < 5; ++i) {
    for (uint16_t pixel = 0; pixel < LED_COUNT; pixel++) {
      leds.setPixelColor(pixel, colors[i][0], colors[i][1], colors[i][2], colors[i][3]);
    }
    leds.show();
    Serial.print(F("MAULT-LED-TEST-2 GPIO=14 LEDs=16 brightness=32 color="));
    Serial.println(names[i]);
    delay(COLOR_HOLD_MS);
  }
}
