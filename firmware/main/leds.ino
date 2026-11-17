// LED strips: two 8-LED NeoPixel (WS2812B) strips chained on one data pin,
// so strip 1 is pixels 0-7 and strip 2 is pixels 8-15. Each LED keeps its
// own on/off, hue and brightness; brightness scales the HSV value of that
// pixel only, so the library's global setBrightness() stays at full and one
// LED can be dimmed without touching the others. Everything starts off at
// boot and nothing is persisted. See PROTOCOL.md (setLed, getLeds).
//
// GPIO 14 on every board: free on the ESP32-S3 (IR uses 4-7, 15, 16, I2C
// 8/9) and classic ESP32 (not strapping or flash); on the Uno R4 it's A0.

#define LED_DATA_PIN 14
#define LED_STRIP_COUNT 2
#define LEDS_PER_STRIP 8
#define LED_COUNT (LED_STRIP_COUNT * LEDS_PER_STRIP)
#define LED_HUE_MAX 359
#define LED_DEFAULT_HUE 0
#define LED_DEFAULT_BRIGHTNESS 128

Adafruit_NeoPixel ledPixels(LED_COUNT, LED_DATA_PIN, NEO_GRB + NEO_KHZ800);

bool ledOn[LED_COUNT];
uint16_t ledHue[LED_COUNT];
uint8_t ledBrightness[LED_COUNT];

uint32_t ledColorAt(int pixel) {
  if (!ledOn[pixel] || ledBrightness[pixel] == 0) return 0;
  uint16_t hue16 = (uint16_t)(((uint32_t)ledHue[pixel] * 65536UL) / (LED_HUE_MAX + 1));
  return ledPixels.gamma32(ledPixels.ColorHSV(hue16, 255, ledBrightness[pixel]));
}

void ledsShow() {
  for (int pixel = 0; pixel < LED_COUNT; pixel++) {
    ledPixels.setPixelColor(pixel, ledColorAt(pixel));
  }
  ledPixels.show();
}

void ledsInit() {
  for (int pixel = 0; pixel < LED_COUNT; pixel++) {
    ledOn[pixel] = false;
    ledHue[pixel] = LED_DEFAULT_HUE;
    ledBrightness[pixel] = LED_DEFAULT_BRIGHTNESS;
  }
  ledPixels.begin();
  ledsShow();
}

void printLeds(Print& reply) {
  reply.print(F("{\"ledStrips\":"));
  reply.print(LED_STRIP_COUNT);
  reply.print(F(",\"ledsPerStrip\":"));
  reply.print(LEDS_PER_STRIP);
  reply.print(F(",\"leds\":["));
  for (int pixel = 0; pixel < LED_COUNT; pixel++) {
    if (pixel > 0) reply.write(',');
    reply.write('[');
    reply.print(ledOn[pixel] ? 1 : 0);
    reply.write(',');
    reply.print(ledHue[pixel]);
    reply.write(',');
    reply.print(ledBrightness[pixel]);
    reply.write(']');
  }
  reply.println(F("]}"));
}

// {"setLed": {"strip": 1, "led": 3, "on": true, "hue": 200, "brightness": 128}}
// strip is 1-2, led is 1-8 and optional (omitted = every LED on the strip).
// on/hue/brightness are each optional; only the ones given change.
// {"getLeds": true} reports every LED. Returns true when it handled the line.
bool handleLedCommand(JsonDocument& doc, Print& reply) {
  if (isTrue(doc["getLeds"])) {
    printLeds(reply);
    return true;
  }
  if (!doc["setLed"].is<JsonObject>()) return false;

  JsonObject request = doc["setLed"].as<JsonObject>();
  int strip = request["strip"] | 0;
  if (strip < 1 || strip > LED_STRIP_COUNT) {
    reply.println(F("{\"error\":\"strip must be 1 to 2\"}"));
    return true;
  }
  int firstLed = 1;
  int lastLed = LEDS_PER_STRIP;
  if (!request["led"].isNull()) {
    int led = request["led"] | 0;
    if (led < 1 || led > LEDS_PER_STRIP) {
      reply.println(F("{\"error\":\"led must be 1 to 8\"}"));
      return true;
    }
    firstLed = led;
    lastLed = led;
  }
  bool hasHue = !request["hue"].isNull();
  int hue = request["hue"] | 0;
  if (hasHue && (hue < 0 || hue > LED_HUE_MAX)) {
    reply.println(F("{\"error\":\"hue must be 0 to 359\"}"));
    return true;
  }
  bool hasBrightness = !request["brightness"].isNull();
  int brightness = request["brightness"] | 0;
  if (hasBrightness && (brightness < 0 || brightness > 255)) {
    reply.println(F("{\"error\":\"brightness must be 0 to 255\"}"));
    return true;
  }
  bool hasOn = !request["on"].isNull();
  bool on = isTrue(request["on"]);

  for (int led = firstLed; led <= lastLed; led++) {
    int pixel = (strip - 1) * LEDS_PER_STRIP + (led - 1);
    if (hasOn) ledOn[pixel] = on;
    if (hasHue) ledHue[pixel] = (uint16_t)hue;
    if (hasBrightness) ledBrightness[pixel] = (uint8_t)brightness;
  }
  ledsShow();
  reply.println(F("{\"status\":\"ok\"}"));
  return true;
}
