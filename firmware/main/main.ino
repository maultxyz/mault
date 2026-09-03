#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// S2/S3 boards must be built with "USB Mode: Hardware CDC and JTAG" and
// "USB CDC On Boot: Enabled" (Arduino IDE Tools menu, or
// USBMode=hwcdc,CDCOnBoot=cdc on the arduino-cli FQBN - see
// firmware-release.yml) - the core then maps Serial to the chip's
// hardware USB-Serial/JTAG peripheral automatically, no app code needed.
// This used to instead be a manually-owned USBCDC/USB-OTG connection so
// the device could report a custom product/manufacturer name, but that
// mode's software bootloader-reset handshake hits an unresolved upstream
// bug when connected directly to a PC rather than through a USB hub
// (reset_sem timeout in usb_switch_to_cdc_jtag() -
// github.com/espressif/arduino-esp32/issues/10204), which made this
// app's in-browser flashEsp32 unreliable. Hardware CDC/JTAG mode's reset
// handshake doesn't hit that bug, at the cost of a fixed Espressif
// device name/VID/PID instead of a custom one. Classic ESP32
// (WROOM/WROVER) and the Uno R4 Minima have no native USB either way and
// are unaffected - Serial there is always the UART bridge chip.

#define FIRMWARE_VERSION "2.0.7"

// Reported in getStatus/boot so the app knows how (or whether) it can
// update the device - only the ESP32 build can be reflashed from the
// browser (see use-serial.tsx's flashEsp32).
#if defined(ARDUINO_ARCH_ESP32)
#define BOARD_TYPE "esp32"
#else
#define BOARD_TYPE "uno_r4"
#endif

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// PCA9685 channels: each module uses 3 consecutive channels (bottom, paddle,
// pusher) starting at moduleChannelOffset; the feeder gets the next channel
// after the last addressable module. Offset is set via
// {"setChannelOffset": N} - 0 for standard wiring, 4 for legacy hardware
// that reserves channels 0-3 for old status LEDs (caps at 3 modules instead
// of 5). MAX_MODULES only sizes arrays; maxModuleForOffset() is the actual
// addressable count for the current offset.
#define MAX_MODULES 5
int moduleChannelOffset = 0;

// IR sensor pins, one per module (active LOW: pin reads LOW when a card is
// present).
#if defined(CONFIG_IDF_TARGET_ESP32S3)
// ESP32-S3 pins avoid strapping (0, 3, 45, 46), the native USB D-/D+ pair
// (19, 20), the default I2C pins used to
// wire the PCA9685 (8, 9 - see Wiring), the USB-UART bridge (43, 44), and
// integrated flash/PSRAM (26-37).
const int IR_PINS[MAX_MODULES] = {4, 5, 6, 7, 15};
#define IR_PIN_HOPPER 16
#elif defined(ARDUINO_ARCH_ESP32)
// Classic ESP32 (WROOM/WROVER) pins avoid strapping (0, 2, 5, 12, 15),
// flash (6-11), WROVER PSRAM (16, 17), and input-only pins (34-39, no
// internal pull-up) - renumber for other ESP32 variants as needed.
const int IR_PINS[MAX_MODULES] = {18, 19, 23, 25, 26};
#define IR_PIN_HOPPER 27
#else
const int IR_PINS[MAX_MODULES] = {2, 3, 4, 6, 7};
#define IR_PIN_HOPPER 5
#endif

#define IR_TIMEOUT_MS 3000

// If a card sits at module 1 this long with no route in progress, something's stuck.
#define MODULE1_JAM_TIMEOUT_MS 20000

// Declared here (before any function) because the Arduino builder hoists
// auto-generated function prototypes above it - a hoisted
// `FeedResult runFeeder();` would precede this and fail to compile
// ("FeedResult does not name a type") if it were declared later instead.
enum FeedResult { FEED_DETECTED, FEED_TIMEOUT, FEED_EMPTY };

// Largest module number whose 3 channels, plus one feeder channel right
// after it, still fit in channels [offset, 15].
int maxModuleForOffset() {
  int n = (15 - moduleChannelOffset) / 3;
  return n < 0 ? 0 : n;
}

int irPin(int module) {
  return IR_PINS[module - 1];
}

bool hopperHasCards() {
  return digitalRead(IR_PIN_HOPPER) == LOW;
}

bool waitForCard(int module, int timeoutMs = IR_TIMEOUT_MS) {
  unsigned long start = millis();
  while (digitalRead(irPin(module)) == HIGH) {
    if (millis() - start > (unsigned long)timeoutMs) return false;
    delay(5);
  }
  return true;
}

// Returns the first module number (1-based) whose gate sensor currently
// reads a card present, or 0 if none are blocked. Used to refuse to run
// the mechanical self-test with something already sitting in the
// mechanism - the test sweeps every trapdoor/paddle/pusher without regard
// for a card that's already there. Doesn't check the hopper sensor, since
// cards waiting in the hopper are a normal, expected state, not a jam.
int findBlockedModule() {
  for (int m = 1; m <= maxModuleForOffset(); m++) {
    if (digitalRead(irPin(m)) == LOW) return m;
  }
  return 0;
}

struct ModuleConfig {
  int bottomClosed, bottomOpen;
  int paddleClosed, paddleOpen;
  int pusherLeft, pusherNeutral, pusherRight;
};

ModuleConfig moduleConfig[MAX_MODULES];

struct FeederConfig {
  int speed;
  int duration;        // overall timeout (ms) before giving up
  int pulseDuration;    // ms per pulse; 0 = continuous feed, no pulsing
  int pauseDuration;    // ms between pulses (IR checked after each stop)
  int settleDuration;   // extra ms to feed once IR sees the card, so it
                         // clears the sensor instead of stopping right on it
};

FeederConfig feederConfig = {315, 1000, 40, 100, 100};

// Routing delays (ms) — tune to match your hardware timing
#define DELAY_CARD_ENTER   300  // time for card to settle after target bottom opens
#define DELAY_PADDLE       300  // time for paddle to engage
#define DELAY_PUSH         600  // time for pusher to complete its stroke

#define MAX_CMD_LEN 200
char inputBuffer[MAX_CMD_LEN + 1];
uint8_t inputLen = 0;
bool inputOverflowed = false;

unsigned long module1PresentSince = 0;
bool module1JamAlerted = false;

int getChannel(int module, int servoOffset) {
  return moduleChannelOffset + (module - 1) * 3 + servoOffset;
}

int getFeederChannel() {
  return moduleChannelOffset + maxModuleForOffset() * 3;
}

void setServoPosition(int channel, int pulse) {
  pwm.setPWM(channel, 0, constrain(pulse, 120, 490));
}

void setModuleNeutral(int module) {
  ModuleConfig& c = moduleConfig[module - 1];
  setServoPosition(getChannel(module, 0), c.bottomClosed);
  setServoPosition(getChannel(module, 1), c.paddleClosed);
  setServoPosition(getChannel(module, 2), c.pusherNeutral);
}

void stopFeeder() {
  pwm.setPin(getFeederChannel(), 0);  // cut PWM signal entirely to stop 360° servo
}

// The last card in the hopper has nothing behind it to push it fully in, so
// once the hopper's empty, keep the motor running settleDuration ms longer.
void settleAndStopFeeder() {
  if (!hopperHasCards()) {
    delay(feederConfig.settleDuration);
  }
  stopFeeder();
}

// Pulses the feeder, polling module 1's IR between pulses (continuous if
// pulseDuration is 0). Returns FEED_EMPTY only if the hopper was already
// empty AND no card is waiting at module 1 - once feeding starts, the
// hopper going empty just means this is the last card and must not abort
// the feed. routeCard() also calls this again as a presence check right
// before routing, so module 1 must be checked before the hopper check, or
// the last card (hopper already empty by then) gets misreported as absent.
FeedResult runFeeder() {
  unsigned long start = millis();

  if (digitalRead(irPin(1)) == LOW) return FEED_DETECTED;

  if (!hopperHasCards()) {
    setServoPosition(getFeederChannel(), feederConfig.speed);
    delay(feederConfig.pulseDuration > 0 ? feederConfig.pulseDuration : 200);
    stopFeeder();
    if (digitalRead(irPin(1)) == LOW) return FEED_DETECTED;
    if (!hopperHasCards()) return FEED_EMPTY;
  }

  if (feederConfig.pulseDuration <= 0) {
    setServoPosition(getFeederChannel(), feederConfig.speed);
    while (millis() - start < (unsigned long)feederConfig.duration) {
      if (digitalRead(irPin(1)) == LOW) {
        settleAndStopFeeder();
        return FEED_DETECTED;
      }
      delay(2);
    }
    stopFeeder();
    return FEED_TIMEOUT;
  }

  while (millis() - start < (unsigned long)feederConfig.duration) {
    if (digitalRead(irPin(1)) == LOW) return FEED_DETECTED;

    setServoPosition(getFeederChannel(), feederConfig.speed);

    unsigned long pulseStart = millis();
    while (millis() - pulseStart < (unsigned long)feederConfig.pulseDuration) {
      if (digitalRead(irPin(1)) == LOW) {
        settleAndStopFeeder();
        return FEED_DETECTED;
      }
      delay(2);
    }

    stopFeeder();
    if (digitalRead(irPin(1)) == LOW) {
      // Motor's already off - only the last card (hopper now empty) needs an extra push to fully seat it.
      if (!hopperHasCards()) {
        setServoPosition(getFeederChannel(), feederConfig.speed);
        delay(feederConfig.settleDuration);
        stopFeeder();
      }
      return FEED_DETECTED;
    }
    delay(feederConfig.pauseDuration);
  }
  return FEED_TIMEOUT;
}

// Runs between commands only (routeCard()/runFeeder() block loop() for
// their duration). Reports once if a card sits at module 1 continuously
// past MODULE1_JAM_TIMEOUT_MS with no route in progress; re-arms once the
// sensor sees the card leave.
void checkModule1Jam() {
  bool present = digitalRead(irPin(1)) == LOW;
  if (!present) {
    module1PresentSince = 0;
    module1JamAlerted = false;
    return;
  }
  if (module1PresentSince == 0) {
    module1PresentSince = millis();
    return;
  }
  if (!module1JamAlerted && millis() - module1PresentSince > MODULE1_JAM_TIMEOUT_MS) {
    module1JamAlerted = true;
    Serial.println(F("{\"error\":\"jam\",\"module\":1}"));
  }
}

#if defined(RGB_BUILTIN)
#ifndef RGB_BRIGHTNESS
#define RGB_BRIGHTNESS 64
#endif

void updateStatusLed() {
  static unsigned long lastStep = 0;
  static uint8_t wheelPos = 0;

  if (!Serial) {
    rgbLedWrite(RGB_BUILTIN, 0, 0, RGB_BRIGHTNESS);
    return;
  }

  if (millis() - lastStep < 20) return;
  lastStep = millis();

  uint8_t pos = 255 - wheelPos++;
  uint8_t r, g, b;
  if (pos < 85) {
    r = 255 - pos * 3; g = 0; b = pos * 3;
  } else if (pos < 170) {
    pos -= 85;
    r = 0; g = pos * 3; b = 255 - pos * 3;
  } else {
    pos -= 170;
    r = pos * 3; g = 255 - pos * 3; b = 0;
  }
  rgbLedWrite(RGB_BUILTIN, (r * RGB_BRIGHTNESS) / 255, (g * RGB_BRIGHTNESS) / 255,
              (b * RGB_BRIGHTNESS) / 255);
}
#endif

void setAllNeutral() {
  for (int m = 1; m <= maxModuleForOffset(); m++) setModuleNeutral(m);
  stopFeeder();
  delay(200);
}

int getPositionPulse(int module, int servoOffset, const char* position) {
  ModuleConfig& c = moduleConfig[module - 1];
  if (servoOffset == 0) {
    if (strcmp(position, "open") == 0)   return c.bottomOpen;
    return c.bottomClosed;
  }
  if (servoOffset == 1) {
    if (strcmp(position, "open") == 0)   return c.paddleOpen;
    return c.paddleClosed;
  }
  if (servoOffset == 2) {
    if (strcmp(position, "left") == 0)   return c.pusherLeft;
    if (strcmp(position, "right") == 0)  return c.pusherRight;
    return c.pusherNeutral;
  }
  return -1;
}

int getServoOffset(const char* servo) {
  if (strcmp(servo, "bottom") == 0) return 0;
  if (strcmp(servo, "paddle") == 0) return 1;
  if (strcmp(servo, "pusher") == 0) return 2;
  return -1;
}

void printModuleRangeError() {
  Serial.print(F("{\"error\":\"module must be 1 to "));
  Serial.print(maxModuleForOffset());
  Serial.println(F("\"}"));
}

bool feedNextCard() {
  FeedResult feedResult = runFeeder();
  if (feedResult == FEED_DETECTED) return true;

  Serial.print(F("{\"error\":\""));
  Serial.print(feedResult == FEED_EMPTY
    ? F("empty: feeder hopper is out of cards")
    : F("timeout: feeder did not deliver card to module 1"));
  Serial.print(F("\",\"empty\":"));
  Serial.print(feedResult == FEED_EMPTY ? F("true") : F("false"));
  Serial.println(F("}"));
  setAllNeutral();
  return false;
}

// "bottom" targets targetModule's own trapdoor, not a shared catch-all - a
// bin can attach "bottom" to any module. Like "left"/"right" below, it walks
// the card through each preceding module one at a time (confirming arrival
// via that module's IR sensor) before dropping it through the target
// module's own bottom, rather than opening every module's trapdoor at once,
// which would drop the card through the first (nearest) open module instead
// of the one actually targeted.
void routeCard(int targetModule, const char* direction) {
  if (targetModule < 1 || targetModule > maxModuleForOffset()) {
    printModuleRangeError();
    return;
  }

  if (!feedNextCard()) return;

  bool dropBottom = strcmp(direction, "bottom") == 0;
  bool pushLeft = strcmp(direction, "left") == 0;

  for (int m = 1; m < targetModule; m++) {
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    if (!waitForCard(m + 1)) {
      Serial.print(F("{\"error\":\"timeout: no card detected at module "));
      Serial.print(m + 1);
      Serial.println(F("\"}"));
      setAllNeutral();
      return;
    }
  }
  if (targetModule > 1) delay(DELAY_CARD_ENTER);

  if (dropBottom) {
    setServoPosition(getChannel(targetModule, 0), moduleConfig[targetModule - 1].bottomOpen);
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);

    Serial.print(F("{\"status\":\"routed\",\"module\":"));
    Serial.print(targetModule);
    Serial.println(F(",\"direction\":\"bottom\"}"));
    return;
  }

  ModuleConfig& c = moduleConfig[targetModule - 1];
  setServoPosition(getChannel(targetModule, 1), c.paddleOpen);
  delay(DELAY_PADDLE);
  setServoPosition(getChannel(targetModule, 2), pushLeft ? c.pusherLeft : c.pusherRight);
  delay(DELAY_PUSH);
  for (int m = 1; m <= targetModule; m++) setModuleNeutral(m);
  delay(200);

  Serial.print(F("{\"status\":\"routed\",\"module\":"));
  Serial.print(targetModule);
  Serial.print(F(",\"direction\":\""));
  Serial.print(pushLeft ? F("left") : F("right"));
  Serial.println(F("\"}"));
}

void printJsonEscaped(const char* s) {
  for (const char* p = s; *p; p++) {
    char c = *p;
    if (c == '"' || c == '\\') {
      Serial.write('\\');
      Serial.write(c);
    } else if (c == '\n') {
      Serial.print(F("\\n"));
    } else if (c == '\r') {
      Serial.print(F("\\r"));
    } else if ((unsigned char)c >= 0x20) {
      Serial.write(c);
    }
  }
}

void handleCommand(char* json) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    Serial.print(F("{\"error\":\"invalid JSON\",\"reason\":\""));
    Serial.print(err.c_str());
    Serial.print(F("\",\"length\":"));
    Serial.print(strlen(json));
    Serial.print(F(",\"received\":\""));
    printJsonEscaped(json);
    Serial.println(F("\"}"));
    return;
  }

  // {"getStatus": true} — report readiness/version on demand; see
  // PROTOCOL.md for why the app sends this on every connection.
  if (doc["getStatus"].is<bool>() && doc["getStatus"].as<bool>()) {
    Serial.print(F("{\"status\":\"ready\",\"version\":\""));
    Serial.print(FIRMWARE_VERSION);
    Serial.print(F("\",\"board\":\""));
    Serial.print(BOARD_TYPE);
    Serial.println(F("\"}"));
    return;
  }

  // {"setChannelOffset": N} — see channel layout comment near the top.
  if (doc["setChannelOffset"].is<int>()) {
    moduleChannelOffset = doc["setChannelOffset"].as<int>();
    setAllNeutral();
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    int blockedModule = findBlockedModule();
    if (blockedModule > 0) {
      Serial.print(F("{\"error\":\"module "));
      Serial.print(blockedModule);
      Serial.print(F(" sensor is blocked - clear the device before testing\",\"module\":"));
      Serial.print(blockedModule);
      Serial.println(F("}"));
      return;
    }

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
      setServoPosition(getChannel(m, 1), moduleConfig[m - 1].paddleOpen);
    }
    delay(DELAY_PUSH);

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherLeft);
    }
    delay(DELAY_PUSH);

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherRight);
    }
    delay(DELAY_PUSH);

    setAllNeutral();
    delay(200);

    setServoPosition(getFeederChannel(), feederConfig.speed);
    delay(500);
    stopFeeder();
    delay(200);

    Serial.println(F("{\"status\":\"test_complete\"}"));
    return;
  }

  // {"neutral": true} — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"clearDevice": true} — flushes any physically stuck card out the
  // bottom regardless of feeder/hopper state; unlike catch-all routing,
  // doesn't call runFeeder() first.
  if (doc["clearDevice"].is<bool>() && doc["clearDevice"].as<bool>()) {
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    delay(DELAY_PUSH);
    setAllNeutral();
    delay(200);
    Serial.println(F("{\"status\":\"cleared\"}"));
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
      return;
    }
    int offset = getServoOffset(servo);
    if (offset < 0) {
      Serial.println(F("{\"error\":\"servo must be bottom, paddle, or pusher\"}"));
      return;
    }
    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      pulse = getPositionPulse(module, offset, doc["position"] | "neutral");
      if (pulse < 0) {
        Serial.println(F("{\"error\":\"invalid position\"}"));
        return;
      }
    }
    setServoPosition(getChannel(module, offset), pulse);
    delay(200);

    Serial.print(F("{\"status\":\"ok\",\"servo\":\""));
    Serial.print(servo);
    Serial.print(F("\",\"module\":"));
    Serial.print(module);
    Serial.println(F("}"));
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObject cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
      return;
    }
    ModuleConfig& c = moduleConfig[module - 1];
    c.bottomClosed  = cfg["bottomClosed"]  | c.bottomClosed;
    c.bottomOpen    = cfg["bottomOpen"]    | c.bottomOpen;
    c.paddleClosed  = cfg["paddleClosed"]  | c.paddleClosed;
    c.paddleOpen    = cfg["paddleOpen"]    | c.paddleOpen;
    c.pusherLeft    = cfg["pusherLeft"]    | c.pusherLeft;
    c.pusherNeutral = cfg["pusherNeutral"] | c.pusherNeutral;
    c.pusherRight   = cfg["pusherRight"]   | c.pusherRight;

    Serial.print(F("{\"status\":\"ok\",\"module\":"));
    Serial.print(module);
    Serial.println(F("}"));
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    FeedResult result = runFeeder();
    Serial.print(F("{\"status\":\"ok\",\"detected\":"));
    Serial.print(result == FEED_DETECTED ? F("true") : F("false"));
    Serial.print(F(",\"empty\":"));
    Serial.print(result == FEED_EMPTY ? F("true") : F("false"));
    Serial.println(F("}"));
    return;
  }

  // {"feederValue": N} — set raw PWM (for calibration preview, does not auto-stop)
  if (doc["feederValue"].is<int>()) {
    setServoPosition(getFeederChannel(), doc["feederValue"].as<int>());
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"feederStop": true} — stop feeder immediately
  if (doc["feederStop"].is<bool>() && doc["feederStop"].as<bool>()) {
    stopFeeder();
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"setFeederConfig": {"speed": N, "duration": N, "pulseDuration": N, "pauseDuration": N, "settleDuration": N}}
  if (!doc["setFeederConfig"].isNull()) {
    JsonObject cfg = doc["setFeederConfig"];
    feederConfig.speed          = cfg["speed"]          | feederConfig.speed;
    feederConfig.duration       = cfg["duration"]       | feederConfig.duration;
    feederConfig.pulseDuration  = cfg["pulseDuration"]  | feederConfig.pulseDuration;
    feederConfig.pauseDuration  = cfg["pauseDuration"]  | feederConfig.pauseDuration;
    feederConfig.settleDuration = cfg["settleDuration"] | feederConfig.settleDuration;
    stopFeeder();
    Serial.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    Serial.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      if (m > 1) Serial.print(',');
      Serial.print(digitalRead(irPin(m)) == LOW ? F("true") : F("false"));  // true = card present
    }
    Serial.print(F("],\"hopper\":"));
    Serial.print(hopperHasCards() ? F("true") : F("false"));  // true = cards remain in feeder stack
    Serial.println(F("}"));
    return;
  }

  // {"route": {"module": N, "direction": "left"|"right"|"bottom"}} — see routeCard()
  if (!doc["route"].isNull()) {
    JsonObject route = doc["route"];
    int module = route["module"] | 0;
    const char* direction = route["direction"] | "";
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError();
      return;
    }
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0 &&
        strcmp(direction, "bottom") != 0) {
      Serial.println(F("{\"error\":\"direction must be left, right, or bottom\"}"));
      return;
    }
    routeCard(module, direction);
    return;
  }

  Serial.println(F("{\"error\":\"unknown command\"}"));
}

void setup() {
#if defined(RGB_BUILTIN)
  rgbLedWrite(RGB_BUILTIN, 0, 0, RGB_BRIGHTNESS);  // blue - powered, not yet connected
#endif

  Serial.begin(9600);
  while (!Serial);

  for (int m = 0; m < MAX_MODULES; m++) {
    moduleConfig[m] = {300, 310, 300, 310, 295, 300, 305};
  }

  // All MAX_MODULES pins are set up regardless of the eventual offset/module
  // count - harmless, and the app hasn't told us the offset yet.
  for (int m = 0; m < MAX_MODULES; m++) pinMode(IR_PINS[m], INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);

  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  setAllNeutral();
  Serial.print(F("{\"status\":\"ready\",\"version\":\""));
  Serial.print(FIRMWARE_VERSION);
  Serial.print(F("\",\"board\":\""));
  Serial.print(BOARD_TYPE);
  Serial.println(F("\"}"));
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputOverflowed) {
        Serial.println(F("{\"error\":\"command too long\"}"));
        inputOverflowed = false;
      } else if (inputLen > 0) {
        inputBuffer[inputLen] = '\0';
        handleCommand(inputBuffer);
      }
      inputLen = 0;
    } else if (!inputOverflowed) {
      if (inputLen < MAX_CMD_LEN) {
        inputBuffer[inputLen++] = c;
      } else {
        inputOverflowed = true;
        inputLen = 0;
      }
    }
  }
  checkModule1Jam();
#if defined(RGB_BUILTIN)
  updateStatusLed();
#endif
}
