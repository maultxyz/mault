// LED strips: two 8-LED RGBW NeoPixel (SK6812) strips chained on one data
// pin, so strip 1 is pixels 0-7 and strip 2 is pixels 8-15. Each LED keeps
// its own on/off, red, green, blue and white levels and a brightness that
// scales all four channels of that pixel only, so the library's global
// setBrightness() stays at full and one LED can be dimmed without touching
// the others. Everything starts off at boot and nothing is persisted. See
// PROTOCOL.md (setLed, getLeds).
//
// GPIO 14 on every board: free on the ESP32-S3 (IR uses 4-7, 15, 16, I2C
// 8/9) and classic ESP32 (not strapping or flash); on the Uno R4 it's A0.

#define LED_DATA_PIN 14
#define LED_STRIP_COUNT 2
#define LEDS_PER_STRIP 8
#define LED_COUNT (LED_STRIP_COUNT * LEDS_PER_STRIP)
#define LED_CHANNEL_COUNT 4
#define LED_DEFAULT_WHITE 255
#define LED_DEFAULT_BRIGHTNESS 128

Adafruit_NeoPixel ledPixels(LED_COUNT, LED_DATA_PIN, NEO_GRBW + NEO_KHZ800);

const char* const LED_CHANNEL_KEYS[LED_CHANNEL_COUNT] = {"red", "green", "blue", "white"};

bool ledOn[LED_COUNT];
uint8_t ledChannels[LED_COUNT][LED_CHANNEL_COUNT];
uint8_t ledBrightness[LED_COUNT];

uint8_t ledScaled(int pixel, int channel) {
  return (uint8_t)(((uint16_t)ledChannels[pixel][channel] * ledBrightness[pixel]) / 255);
}

void ledsShow() {
  for (int pixel = 0; pixel < LED_COUNT; pixel++) {
    if (!ledOn[pixel]) {
      ledPixels.setPixelColor(pixel, 0);
      continue;
    }
    ledPixels.setPixelColor(pixel, ledScaled(pixel, 0), ledScaled(pixel, 1),
                            ledScaled(pixel, 2), ledScaled(pixel, 3));
  }
  ledPixels.show();
}

void ledsInit() {
  for (int pixel = 0; pixel < LED_COUNT; pixel++) {
    ledOn[pixel] = false;
    for (int channel = 0; channel < LED_CHANNEL_COUNT; channel++) {
      ledChannels[pixel][channel] = 0;
    }
    ledChannels[pixel][3] = LED_DEFAULT_WHITE;
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
    for (int channel = 0; channel < LED_CHANNEL_COUNT; channel++) {
      reply.write(',');
      reply.print(ledChannels[pixel][channel]);
    }
    reply.write(',');
    reply.print(ledBrightness[pixel]);
    reply.write(']');
  }
  reply.println(F("]}"));
}

// {"setLed": {"strip": 1, "led": 3, "on": true, "red": 255, "green": 0,
//             "blue": 0, "white": 0, "brightness": 128}}
// strip is 1-2, led is 1-8 and optional (omitted = every LED on the strip).
// on and every level (0-255) are optional; only the ones given change.
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

  bool hasChannel[LED_CHANNEL_COUNT];
  int channelValue[LED_CHANNEL_COUNT];
  for (int channel = 0; channel < LED_CHANNEL_COUNT; channel++) {
    hasChannel[channel] = !request[LED_CHANNEL_KEYS[channel]].isNull();
    channelValue[channel] = request[LED_CHANNEL_KEYS[channel]] | 0;
    if (hasChannel[channel] && (channelValue[channel] < 0 || channelValue[channel] > 255)) {
      reply.print(F("{\"error\":\""));
      reply.print(LED_CHANNEL_KEYS[channel]);
      reply.println(F(" must be 0 to 255\"}"));
      return true;
    }
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
    for (int channel = 0; channel < LED_CHANNEL_COUNT; channel++) {
      if (hasChannel[channel]) ledChannels[pixel][channel] = (uint8_t)channelValue[channel];
    }
    if (hasBrightness) ledBrightness[pixel] = (uint8_t)brightness;
  }
  ledsShow();
  reply.println(F("{\"status\":\"ok\"}"));
  return true;
}
