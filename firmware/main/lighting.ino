#if LED_STRIP_SUPPORTED
constexpr uint16_t LED_COUNT = 16;
constexpr uint16_t LED_FULL_MASK = 0XFFFF;
constexpr uint16_t LED_MAIN_MASK = 0XFF7E;
constexpr unsigned long VALUE_CELEBRATION_DEFAULT_MS = 500;
constexpr unsigned long VALUE_CELEBRATION_MIN_MS = 500;
constexpr unsigned long VALUE_CELEBRATION_MAX_MS = 3000;

Adafruit_NeoPixel stripPixels(LED_COUNT, LED_PIN, NEO_GRBW + NEO_KHZ800);
uint16_t stripLedCount = LED_COUNT;
uint16_t stripLedMask = LED_MAIN_MASK;
uint16_t stripBrightness = 160;
const char* stripMode = "off";
RgbwColor stripColor{0, 0, 0, 0};
const char* stripAlert = "none";
unsigned long stripAlertStartedAt = 0;
unsigned long stripLastFrameAt = 0;
unsigned long stripCelebrationDurationMs = VALUE_CELEBRATION_DEFAULT_MS;
LightWarningCycle stripWarnings;
bool stripWarningsSuppressed = false;
LightWarning stripRenderedWarning = LightWarning::None;

void setStripAlert(const char* alert) {
  if (strcmp(alert, "empty") == 0) {
    stripWarnings.empty = true;
    updateLedStrip();
    return;
  }
  if (strcmp(alert, "jam") == 0) {
    stripWarnings.blocked = true;
    updateLedStrip();
    return;
  }
  if (strcmp(alert, "value") != 0) return;
  if (!stripWarningsSuppressed && stripWarnings.enabled && (stripWarnings.empty || stripWarnings.blocked)) return;
  stripAlert = alert;
  stripAlertStartedAt = millis();
  stripLastFrameAt = millis() - 100;
  updateLedStrip();
}

void clearStripAlert(const char* alert) {
  if (strcmp(alert, "empty") == 0) stripWarnings.empty = false;
  if (strcmp(alert, "jam") == 0) stripWarnings.blocked = false;
  if (strcmp(alert, "value") != 0) {
    updateLedStrip();
    return;
  }
  if (strcmp(stripAlert, alert) != 0) return;
  stripAlert = "none";
  renderLedStrip();
}

void printLightState(Print& reply) {
  reply.print(F("{\"status\":\"ok\",\"lightMode\":\""));
  reply.print(stripMode);
  reply.print(F("\",\"lightAlert\":\""));
  reply.print(stripAlert);
  reply.print(F("\",\"brightness\":"));
  reply.print(stripBrightness);
  reply.print(F(",\"leds\":"));
  reply.print(stripLedMask);
  reply.print(F(",\"ledCount\":"));
  reply.print(stripLedCount);
  reply.print(F(",\"warnings\":{\"enabled\":"));
  reply.print(stripWarnings.enabled ? F("true") : F("false"));
  reply.print(F(",\"emptySeconds\":"));
  reply.print(stripWarnings.emptyMs / 1000);
  reply.print(F(",\"blockedSeconds\":"));
  reply.print(stripWarnings.blockedMs / 1000);
  reply.print(F(",\"normalSeconds\":"));
  reply.print(stripWarnings.normalMs / 1000);
  reply.print(F("},\"warningsSuppressed\":"));
  reply.print(stripWarningsSuppressed ? F("true") : F("false"));
  reply.print(F(",\"warningActive\":"));
  reply.print(!stripWarningsSuppressed && stripWarnings.enabled && (stripWarnings.empty || stripWarnings.blocked)
    ? F("true") : F("false"));
  if (strcmp(stripAlert, "value") == 0) {
    reply.print(F(",\"durationMs\":"));
    reply.print(stripCelebrationDurationMs);
  }
  reply.println(F("}"));
}

void renderLedStrip() {
  for (uint16_t i = 0; i < LED_COUNT; i++) {
    const RgbwColor color = i < stripLedCount && ((stripLedMask >> i) & 1) ? stripColor : RgbwColor{0, 0, 0, 0};
    stripPixels.setPixelColor(i, scaleLightChannel(color.r, stripBrightness),
      scaleLightChannel(color.g, stripBrightness), scaleLightChannel(color.b, stripBrightness),
      scaleLightChannel(color.w, stripBrightness));
  }
  stripPixels.show();
}

void renderSolidLedStrip(RgbwColor color) {
  for (uint16_t i = 0; i < LED_COUNT; i++) {
    const RgbwColor pixel = i < stripLedCount ? color : RgbwColor{0, 0, 0, 0};
    stripPixels.setPixelColor(i, scaleLightChannel(pixel.r, stripBrightness),
      scaleLightChannel(pixel.g, stripBrightness), scaleLightChannel(pixel.b, stripBrightness),
      scaleLightChannel(pixel.w, stripBrightness));
  }
  stripPixels.show();
}

void initLedStrip() {
  stripPixels.begin();
  stripPixels.clear();
  stripPixels.show();
  renderLedStrip();
}

void updateLedStrip() {
  if (stripWarnings.empty && hopperHasCards()) stripWarnings.empty = false;
  if (stripWarnings.blocked && findBlockedModule() == 0) stripWarnings.blocked = false;
  const LightWarning warning = stripWarnings.update(millis());
  const LightWarning visibleWarning = stripWarningsSuppressed ? LightWarning::None : warning;
  const bool warningActive = !stripWarningsSuppressed && stripWarnings.enabled &&
    (stripWarnings.empty || stripWarnings.blocked);
  if (warningActive) {
    const char* nextAlert = visibleWarning == LightWarning::Blocked ? "jam" :
      visibleWarning == LightWarning::Empty ? "empty" : "none";
    if (strcmp(stripAlert, nextAlert) != 0 || stripRenderedWarning != visibleWarning) {
      stripAlert = nextAlert;
      stripRenderedWarning = visibleWarning;
      if (visibleWarning == LightWarning::None) {
        renderLedStrip();
      } else {
        renderSolidLedStrip(visibleWarning == LightWarning::Blocked
          ? RgbwColor{255, 0, 0, 0} : RgbwColor{255, 160, 0, 0});
      }
    }
    return;
  }
  if (strcmp(stripAlert, "jam") == 0 || strcmp(stripAlert, "empty") == 0 ||
      stripRenderedWarning != LightWarning::None) {
    stripAlert = "none";
    stripRenderedWarning = LightWarning::None;
    renderLedStrip();
  }
  if (strcmp(stripAlert, "value") == 0) {
    unsigned long elapsed = millis() - stripAlertStartedAt;
    if (strcmp(stripAlert, "value") == 0 && elapsed >= stripCelebrationDurationMs) {
      stripAlert = "none";
      renderLedStrip();
    } else {
      if (millis() - stripLastFrameAt < 5) return;
      stripLastFrameAt = millis();
      const RgbwColor colors[] = {
        {0, 255, 0, 0}, {255, 0, 0, 0}, {0, 0, 255, 0},
      };
      const uint16_t step = celebrationStep(elapsed, stripCelebrationDurationMs, stripLedCount);
      renderSolidLedStrip({0, 0, 0, 0});
      if ((elapsed * (2 * stripLedCount - 1) % stripCelebrationDurationMs) * 5 < stripCelebrationDurationMs * 4) {
        const uint16_t led = celebrationLed(step, stripLedCount);
        const RgbwColor color = colors[step % 3];
        stripPixels.setPixelColor(led, scaleLightChannel(color.r, stripBrightness),
          scaleLightChannel(color.g, stripBrightness), scaleLightChannel(color.b, stripBrightness),
          scaleLightChannel(color.w, stripBrightness));
        stripPixels.show();
      }
      return;
    }
  }
#if ENABLE_DYNAMIC_FOIL_DETECTION
  static unsigned long lastStep = 0;
  static uint16_t position = 0;
  if (strcmp(stripMode, "foil") != 0 || millis() - lastStep < 60) return;
  lastStep = millis();
  renderSolidLedStrip({0, 0, 0, 0});
  const uint16_t led = position == 0 ? 0 : 7;
  const RgbwColor white = whiteLedColor(255);
  stripPixels.setPixelColor(led, scaleLightChannel(white.r, stripBrightness),
    scaleLightChannel(white.g, stripBrightness), scaleLightChannel(white.b, stripBrightness),
    scaleLightChannel(white.w, stripBrightness));
  position = (position + 1) % 2;
  stripPixels.show();
#endif
}

void handleLightCommand(JsonDocument& doc, Print& reply) {
  JsonVariantConst request = doc["setLight"];
  const char* mode = nullptr;
  uint16_t brightness = stripBrightness;
  uint16_t ledMask = LED_MAIN_MASK;
  uint16_t ledCount = stripLedCount;
  unsigned long durationMs = VALUE_CELEBRATION_DEFAULT_MS;
  RgbwColor color = stripColor;
  LightWarningCycle nextWarnings = stripWarnings;
  bool suppressWarnings = false;

  if (request.is<const char*>()) {
    mode = request.as<const char*>();
  } else if (request.is<JsonObjectConst>()) {
    if (!request["mode"].is<const char*>()) {
      reply.println(F("{\"error\":\"setLight.mode must be a string\"}"));
      return;
    }
    mode = request["mode"].as<const char*>();
    if (!request["ledCount"].isNull()) {
      if (!request["ledCount"].is<int>() ||
          (request["ledCount"].as<int>() != 8 && request["ledCount"].as<int>() != 16)) {
        reply.println(F("{\"error\":\"ledCount must be 8 or 16\"}"));
        return;
      }
      ledCount = request["ledCount"].as<uint16_t>();
    }
    if (!request["suppressWarnings"].isNull()) {
      if (!request["suppressWarnings"].is<bool>()) {
        reply.println(F("{\"error\":\"suppressWarnings must be a boolean\"}"));
        return;
      }
      suppressWarnings = request["suppressWarnings"].as<bool>();
    }
    if (!request["warnings"].isNull()) {
      JsonVariantConst warnings = request["warnings"];
      if (!warnings.is<JsonObjectConst>() || !warnings["enabled"].is<bool>()) {
        reply.println(F("{\"error\":\"warnings requires enabled and all three timers\"}"));
        return;
      }
      for (const char* field : {"emptySeconds", "blockedSeconds", "normalSeconds"}) {
        if (!warnings[field].is<unsigned long>() || warnings[field].as<unsigned long>() < 1 ||
            warnings[field].as<unsigned long>() > 300) {
          reply.println(F("{\"error\":\"warning timers must be integers from 1 to 300 seconds\"}"));
          return;
        }
      }
      nextWarnings.enabled = warnings["enabled"].as<bool>();
      nextWarnings.emptyMs = warnings["emptySeconds"].as<unsigned long>() * 1000;
      nextWarnings.blockedMs = warnings["blockedSeconds"].as<unsigned long>() * 1000;
      nextWarnings.normalMs = warnings["normalSeconds"].as<unsigned long>() * 1000;
    }
    if (!request["durationMs"].isNull()) {
      if (!request["durationMs"].is<unsigned long>() ||
        request["durationMs"].as<unsigned long>() < VALUE_CELEBRATION_MIN_MS ||
        request["durationMs"].as<unsigned long>() > VALUE_CELEBRATION_MAX_MS) {
        reply.println(F("{\"error\":\"durationMs must be an integer from 500 to 3000\"}"));
        return;
      }
      durationMs = request["durationMs"].as<unsigned long>();
    }
    const char* fields[] = {"brightness", "r", "g", "b", "w"};
    for (const char* field : fields) {
      if (request[field].isNull()) continue;
      if (!request[field].is<int>() || request[field].as<int>() < 0 ||
          request[field].as<int>() > 255) {
        reply.println(F("{\"error\":\"light values must be integers from 0 to 255\"}"));
        return;
      }
    }
    if (!request["leds"].isNull()) {
      if (!request["leds"].is<int>() || request["leds"].as<int>() < 1 ||
          request["leds"].as<int>() > LED_FULL_MASK) {
        reply.println(F("{\"error\":\"leds must be a bitmask from 1 to 65535\"}"));
        return;
      }
      ledMask = request["leds"].as<uint16_t>();
    }
    brightness = request["brightness"] | stripBrightness;
    if (strcmp(mode, "custom") == 0) {
      if (request["r"].isNull() || request["g"].isNull() || request["b"].isNull()) {
        reply.println(F("{\"error\":\"custom light requires r, g and b\"}"));
        return;
      }
      color = {
        request["r"].as<uint16_t>(),
        request["g"].as<uint16_t>(),
        request["b"].as<uint16_t>(),
        request["w"] | static_cast<uint16_t>(0),
      };
    }
  } else {
    reply.println(F("{\"error\":\"setLight must be a string or object\"}"));
    return;
  }

  const char* nextMode = nullptr;
  if (!doc["clearAlert"].isNull() && !doc["clearAlert"].is<bool>()) {
    reply.println(F("{\"error\":\"clearAlert must be a boolean\"}"));
    return;
  }
  if (strcmp(mode, "value") == 0) {
    stripLedCount = ledCount;
    stripCelebrationDurationMs = durationMs;
    setStripAlert("value");
    printLightState(reply);
    return;
  }
  if (strcmp(mode, "white") == 0 || strcmp(mode, "auto") == 0) {
    nextMode = strcmp(mode, "auto") == 0 ? "auto" : "white";
    color = whiteLedColor(255);
  } else if (strcmp(mode, "off") == 0) {
    nextMode = "off";
    color = {0, 0, 0, 0};
  } else if (strcmp(mode, "custom") == 0) {
    nextMode = "custom";
  } else if (strcmp(mode, "foil") == 0) {
#if ENABLE_DYNAMIC_FOIL_DETECTION
    nextMode = "foil";
    color = whiteLedColor(255);
#else
    reply.println(F("{\"error\":\"dynamic foil lighting is disabled\"}"));
    return;
#endif
  } else {
    reply.println(F("{\"error\":\"light mode must be white, auto, off, custom, foil or value\"}"));
    return;
  }

  stripMode = nextMode;
  stripLedCount = ledCount;
  stripColor = color;
  stripBrightness = brightness;
  stripLedMask = ledMask;
  const bool warningsChanged = stripWarnings.enabled != nextWarnings.enabled ||
    stripWarnings.emptyMs != nextWarnings.emptyMs || stripWarnings.blockedMs != nextWarnings.blockedMs ||
    stripWarnings.normalMs != nextWarnings.normalMs;
  stripWarnings = nextWarnings;
  if (warningsChanged) {
    stripWarnings.selected = LightWarning::None;
    stripWarnings.startedAt = millis();
  }
  stripWarningsSuppressed = suppressWarnings;
  if ((doc["clearAlert"] | false) && strcmp(stripAlert, "value") != 0) {
    stripWarnings.empty = false;
    stripWarnings.blocked = false;
    stripAlert = "none";
  }
  stripRenderedWarning = LightWarning::None;
  if (strcmp(stripAlert, "value") != 0) {
    stripAlert = "none";
    renderLedStrip();
  }
  updateLedStrip();
  printLightState(reply);
}
#else
void setStripAlert(const char* alert) {}
void clearStripAlert(const char* alert) {}
#endif