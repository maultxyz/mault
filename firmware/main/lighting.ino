#if LED_STRIP_SUPPORTED
constexpr uint16_t LED_COUNT = 10;

CRGB stripLeds[LED_COUNT];
uint8_t stripBrightness = 160;
const char* stripMode = "off";
CRGB stripColor = CRGB::Black;
const char* stripAlert = "none";
unsigned long stripAlertStartedAt = 0;
unsigned long stripLastFrameAt = 0;

void setStripAlert(const char* alert) {
  // A jam takes priority over an empty hopper or a valuable-card celebration.
  if (strcmp(stripAlert, "jam") == 0 && strcmp(alert, "jam") != 0) return;
  if (strcmp(stripAlert, "empty") == 0 && strcmp(alert, "value") == 0) return;
  stripAlert = alert;
  stripAlertStartedAt = millis();
  stripLastFrameAt = millis() - 100;
  updateLedStrip();
}

void clearStripAlert(const char* alert) {
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
  reply.println(F("}"));
}

void renderLedStrip() {
  fill_solid(stripLeds, LED_COUNT, stripColor);
  FastLED.setBrightness(stripBrightness);
  FastLED.show();
}

void initLedStrip() {
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(stripLeds, LED_COUNT);
  renderLedStrip();
}

void updateLedStrip() {
  if (strcmp(stripAlert, "none") != 0) {
    unsigned long elapsed = millis() - stripAlertStartedAt;
    if (strcmp(stripAlert, "value") == 0 && elapsed >= 3000) {
      stripAlert = "none";
      renderLedStrip();
    } else {
      if (millis() - stripLastFrameAt < 100) return;
      stripLastFrameAt = millis();
      CRGB color = CRGB::Black;
      if (strcmp(stripAlert, "value") == 0) {
        const CRGB colors[] = {CRGB::Red, CRGB::Green, CRGB::Blue};
        if ((elapsed / 250) % 2 == 0) color = colors[(elapsed / 500) % 3];
      } else if ((elapsed / 500) % 2 == 0) {
        color = strcmp(stripAlert, "jam") == 0 ? CRGB::Red : CRGB::Yellow;
      }
      fill_solid(stripLeds, LED_COUNT, color);
      FastLED.setBrightness(stripBrightness);
      FastLED.show();
      return;
    }
  }
#if ENABLE_DYNAMIC_FOIL_DETECTION
  static unsigned long lastStep = 0;
  static uint8_t position = 0;
  if (strcmp(stripMode, "foil") != 0 || millis() - lastStep < 60) return;
  lastStep = millis();
  fill_solid(stripLeds, LED_COUNT, CRGB(30, 30, 40));
  stripLeds[position] = CRGB::White;
  stripLeds[(position + 1) % LED_COUNT] = CRGB::White;
  position = (position + 1) % LED_COUNT;
  FastLED.show();
#endif
}

void handleLightCommand(JsonDocument& doc, Print& reply) {
  JsonVariantConst request = doc["setLight"];
  const char* mode = nullptr;
  uint8_t brightness = stripBrightness;
  CRGB color = stripColor;

  if (request.is<const char*>()) {
    mode = request.as<const char*>();
  } else if (request.is<JsonObjectConst>()) {
    if (!request["mode"].is<const char*>()) {
      reply.println(F("{\"error\":\"setLight.mode must be a string\"}"));
      return;
    }
    mode = request["mode"].as<const char*>();
    const char* fields[] = {"brightness", "r", "g", "b"};
    for (const char* field : fields) {
      if (request[field].isNull()) continue;
      if (!request[field].is<int>() || request[field].as<int>() < 0 ||
          request[field].as<int>() > 255) {
        reply.println(F("{\"error\":\"light values must be integers from 0 to 255\"}"));
        return;
      }
    }
    brightness = request["brightness"] | stripBrightness;
    if (strcmp(mode, "custom") == 0) {
      if (request["r"].isNull() || request["g"].isNull() || request["b"].isNull()) {
        reply.println(F("{\"error\":\"custom light requires r, g and b\"}"));
        return;
      }
      color = CRGB(request["r"].as<uint8_t>(), request["g"].as<uint8_t>(),
                   request["b"].as<uint8_t>());
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
    setStripAlert("value");
    printLightState(reply);
    return;
  }
  if (strcmp(mode, "white") == 0 || strcmp(mode, "auto") == 0) {
    nextMode = strcmp(mode, "auto") == 0 ? "auto" : "white";
    color = CRGB(240, 240, 255);
  } else if (strcmp(mode, "off") == 0) {
    nextMode = "off";
    color = CRGB::Black;
  } else if (strcmp(mode, "custom") == 0) {
    nextMode = "custom";
  } else if (strcmp(mode, "foil") == 0) {
#if ENABLE_DYNAMIC_FOIL_DETECTION
    nextMode = "foil";
    color = CRGB::White;
#else
    reply.println(F("{\"error\":\"dynamic foil lighting is disabled\"}"));
    return;
#endif
  } else {
    reply.println(F("{\"error\":\"light mode must be white, auto, off, custom, foil or value\"}"));
    return;
  }

  stripMode = nextMode;
  stripColor = color;
  stripBrightness = brightness;
  if ((doc["clearAlert"] | false) && strcmp(stripAlert, "value") != 0) {
    stripAlert = "none";
  }
  if (strcmp(stripAlert, "none") == 0) renderLedStrip();
  printLightState(reply);
}
#else
void setStripAlert(const char* alert) {}
void clearStripAlert(const char* alert) {}
#endif