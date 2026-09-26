#include <ArduinoJson.h>
#include <EEPROM.h>
#include <Wire.h>
#include <ctype.h>
#include <Adafruit_PWMServoDriver.h>
#if defined(ARDUINO_ARCH_ESP32)
#include "esp_mac.h"
#else
#include <WDT.h>
#endif

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

#define FIRMWARE_VERSION "2.0.16"

// Reported in getStatus/boot so the app knows how (or whether) it can
// update the device - only the ESP32 build can be reflashed from the
// browser (see use-serial.tsx's flashEsp32).
#if defined(ARDUINO_ARCH_ESP32)
#define BOARD_TYPE "esp32"
#else
#define BOARD_TYPE "uno_r4"
#endif

// Which (if any) BLE backend this build compiles in. ARDUINO_UNOWIFIR4 is the
// Renesas core's board macro for the arduino:renesas_uno:unor4wifi FQBN
// (mirroring ARDUINO_MINIMA for the plain arduino:renesas_uno:minima variant,
// which has no BLE hardware and must stay Serial-only) - confirmed correct
// by a real compile against the installed core (selects BLE_BACKEND_ARDUINOBLE
// as expected for the WiFi board). Only the S3 gets a BLE backend on the
// ESP32 side - classic ESP32 (WROOM/WROVER) isn't a build target today (see
// firmware-release.yml) and its Bluedroid BLE would need its own IR pin map
// consideration if that ever changes.
#if defined(ARDUINO_UNOWIFIR4)
#define BLE_SUPPORTED 1
#define BLE_BACKEND_ARDUINOBLE 1
#elif defined(ARDUINO_ARCH_ESP32) && defined(CONFIG_IDF_TARGET_ESP32S3)
#define BLE_SUPPORTED 1
#define BLE_BACKEND_ESP32 1
#else
#define BLE_SUPPORTED 0
#endif

// These must be #included here (not just in ble_arduinoble.ino/ble_esp32.ino,
// even though that's where they're actually used) - the Arduino builder
// inserts its auto-generated function prototypes for the WHOLE merged
// sketch at one point anchored to this file's own leading #include block,
// before any other tab's #includes take effect. A prototype referencing
// BLEDevice/BLECharacteristic/etc. hoisted to that point fails to compile
// ("was not declared in this scope") unless these headers are already
// visible there.
#if BLE_BACKEND_ARDUINOBLE
#include <ArduinoBLE.h>
#elif BLE_BACKEND_ESP32
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#endif

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// Short, human-distinguishable ID identifying this specific physical board -
// the same value regardless of which transport (Serial or BLE) a client
// reads it over, and stable across power cycles/resets, so the app can key a
// saved device record to a specific unit and multiple units show up as
// distinct entries in a phone/OS Bluetooth picker before ever connecting.
// Populated once from setup(), before the boot banner is printed, via the
// best source available on the board:
//   - ESP32 (any variant): the factory Wi-Fi/BT MAC (setDeviceIdFromMac()
//     below), read unconditionally - present on the silicon regardless of
//     whether this build even compiles in a BLE backend (see BLE_SUPPORTED).
//   - Uno R4 WiFi: also MAC-derived, but only readable after BLE.begin()
//     talks to the onboard co-processor, so it's set from inside bleInit()
//     (see ble_arduinoble.ino) instead of here.
//   - Uno R4 Minima (no radio of any kind): falls back to
//     loadOrCreateDeviceId() below, which persists a random one-time-
//     generated ID to EEPROM/data flash - the only board with nothing
//     factory-unique to read.
char deviceId[7] = "";

// Formats a colon-separated MAC string ("aa:bb:cc:dd:ee:ff") into deviceId as
// its last 6 hex characters, uppercased and with colons stripped - plenty of
// entropy to tell boards apart on a bench without needing the full address.
void setDeviceIdFromMac(const char* mac) {
  char stripped[13];
  int len = 0;
  for (const char* p = mac; *p && len < 12; p++) {
    if (*p != ':') stripped[len++] = (char)toupper((unsigned char)*p);
  }
  stripped[len] = '\0';
  int start = len > 6 ? len - 6 : 0;
  strncpy(deviceId, stripped + start, 6);
  deviceId[6] = '\0';
}

#if defined(ARDUINO_ARCH_ESP32)
// Every ESP32 (classic or S3) has a factory-programmed Wi-Fi/BT MAC
// regardless of whether this build even compiles in the BLE backend
// (BLE_SUPPORTED is 0 for classic ESP32 - see below) - ESP_MAC_WIFI_STA is
// readable unconditionally, unlike the Uno R4 WiFi's BLE.address(), which
// needs the co-processor initialized first.
void initDeviceIdFromEspMac() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0],
           mac[1], mac[2], mac[3], mac[4], mac[5]);
  setDeviceIdFromMac(macStr);
}
#endif

#define DEVICE_ID_EEPROM_ADDR 0
// Marks that a device ID was already generated and stored, so a re-flash or
// reset doesn't hand out a fresh random one - written only once, on this
// board's actual first boot.
#define DEVICE_ID_EEPROM_MAGIC 0xA5

// Last-resort fallback for a board with no factory-unique hardware ID to
// read at all (only the Uno R4 Minima, which has no radio - see deviceId's
// comment above). Unlike servo calibration, which this firmware intentionally
// does NOT remember across power-off (see setConfig's docs in PROTOCOL.md), a
// board's identity has to survive a reset or it's useless for keying a saved
// device record to a specific physical unit - so this one value does get
// persisted, to EEPROM (which the Renesas UNO R4 core emulates over its
// internal data flash).
void loadOrCreateDeviceId() {
#if defined(ARDUINO_ARCH_ESP32)
  EEPROM.begin(8);
#endif

  if (EEPROM.read(DEVICE_ID_EEPROM_ADDR) == DEVICE_ID_EEPROM_MAGIC) {
    for (int i = 0; i < 6; i++) {
      deviceId[i] = (char)EEPROM.read(DEVICE_ID_EEPROM_ADDR + 1 + i);
    }
    deviceId[6] = '\0';
    return;
  }

  randomSeed(micros());
  const char hexDigits[] = "0123456789ABCDEF";
  for (int i = 0; i < 6; i++) {
    deviceId[i] = hexDigits[random(0, 16)];
  }
  deviceId[6] = '\0';

  EEPROM.write(DEVICE_ID_EEPROM_ADDR, DEVICE_ID_EEPROM_MAGIC);
  for (int i = 0; i < 6; i++) {
    EEPROM.write(DEVICE_ID_EEPROM_ADDR + 1 + i, deviceId[i]);
  }
#if defined(ARDUINO_ARCH_ESP32)
  EEPROM.commit();
#endif
}

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

// Uno R4 only (its WDT tops out at ~5.6s). Every blocking wait goes through
// waitMs(), which keeps it fed, so it only fires if the board truly hangs,
// e.g. after a supply dip from servos moving together leaves the MCU or
// its I2C peripheral wedged. The reboot drops USB, so the app sees a
// disconnect instead of a sorter that silently stops answering.
#define WATCHDOG_TIMEOUT_MS 4000

#define SERVO_PWM_FREQ 50
// Gap between consecutive servo moves in setAllNeutral(), so a full reset
// doesn't start every servo at once and pull the supply down.
#define SERVO_STAGGER_MS 25

// If a card sits at a module this long with no route in progress, something's
// stuck - just report it. Paddle-flap recovery only happens while a route is
// actively moving a card through (see routeCard()) - something merely
// resting on a sensor while the device is idle (a card left in a tray, a
// hand, dust) isn't a jam a wiggle should react to.
#define MODULE_JAM_TIMEOUT_MS 20000
#define SERVO_IDLE_RELEASE_MS 1500

// The Arduino builder auto-generates a forward declaration for every
// function and hoists all of them to one insertion point near the top of
// the file - earlier than this enum, since setDeviceIdFromMac() and other
// functions above already exist there. That hoisted `FeedResult runFeeder();`
// then fails to compile ("FeedResult does not name a type") on cores whose
// bundled ctags can't resolve the return type at that point (this is the
// case on ESP32, not on the Uno R4 board's core). Writing our own prototype
// below stops the builder from generating a conflicting one, since it skips
// auto-prototyping any function that already has an explicit declaration.
enum FeedResult { FEED_DETECTED, FEED_TIMEOUT, FEED_EMPTY };
FeedResult runFeeder();

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

void feedWatchdog() {
#if !defined(ARDUINO_ARCH_ESP32)
  WDT.refresh();
#endif
}

void waitMs(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    feedWatchdog();
    unsigned long left = ms - (millis() - start);
    delay(left < 50 ? left : 50);
  }
  feedWatchdog();
}

bool waitForCard(int module, int timeoutMs = IR_TIMEOUT_MS) {
  unsigned long start = millis();
  while (digitalRead(irPin(module)) == HIGH) {
    if (millis() - start > (unsigned long)timeoutMs) return false;
    waitMs(5);
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
  int pusherHoldDuration;  // ms the pusher stays extended before
                           // returning to neutral
  int paddleCloseDelay;  // ms from the pusher firing until this module's
                          // paddle closes again - independent of
                          // DELAY_PUSHER_HOLD, which governs when the pusher
                          // itself returns to neutral (see routeCard())
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
// A servo is positional, not velocity-controlled - commanding it to (or past)
// a hard mechanical stop makes it stall at full torque against that stop for
// as long as it's held there, not just for the instant it takes to arrive.
// The fling itself happens in the first ~100ms of travel; every extra ms
// held against the stop after that is pure stress on the horn/shaft with no
// benefit, and is what walks the horn loose over repeated cycles. Keep this
// well under DELAY_PUSH and tune it on real hardware: long enough for the
// pusher to complete its swing and actually fling the card, short enough
// that it's released before it's spent much time stalled at the stop.
#define DELAY_PUSHER_HOLD  150

#define MAX_CMD_LEN 255

// One InputState per transport - a command's response must go back out the
// same transport it arrived on (the protocol has no request IDs; a client
// correlates request/response positionally, see PROTOCOL.md), so a partial
// line from one transport must never get spliced with a partial line from
// the other.
struct InputState {
  char buf[MAX_CMD_LEN + 1];
  uint8_t len = 0;
  bool overflowed = false;
};
InputState serialInput;
#if BLE_SUPPORTED
InputState bleInput;
#endif

// Manual prototype: the Arduino builder's auto-generated forward
// declarations are hoisted above this point in the file (before
// InputState even exists there), which fails to compile for any function
// taking it by reference. An explicit prototype here - matching feedByte()'s
// eventual definition further down - stops the builder from generating its
// own broken one for it.
void feedByte(InputState& s, char c, Print& reply);

unsigned long modulePresentSince[MAX_MODULES] = {0};
bool moduleJamAlerted[MAX_MODULES] = {false};

int getChannel(int module, int servoOffset) {
  return moduleChannelOffset + (module - 1) * 3 + servoOffset;
}

int getFeederChannel() {
  return moduleChannelOffset + maxModuleForOffset() * 3;
}

unsigned long lastServoMoveAt = 0;
bool servosReleased = false;

void configureI2c() {
  // Renesas' Wire ignores setWireTimeout's reset flag, so a timed-out
  // transaction leaves the peripheral wedged; recoverServoDriver() restarts
  // it instead. arduino-esp32's TwoWire has no setWireTimeout at all, only
  // a millisecond setTimeout, and recovers its own bus.
#if defined(ARDUINO_ARCH_ESP32)
  Wire.setTimeout(25);
#else
  Wire.setWireTimeout(25000, true);
#endif
}

void initServoDriver() {
  pwm.begin();
  configureI2c();
  pwm.setPWMFreq(SERVO_PWM_FREQ);
  delay(10);
}

void recoverServoDriver() {
  Wire.end();
  initServoDriver();
}

// A supply dip can also reset the PCA9685 itself, which silently drops it
// back to its power-on prescale and sleep mode: writes still succeed but
// no servo moves. Its prescale register is the cheapest tell.
void ensureServoDriver() {
  uint8_t expected = (uint8_t)(round(25000000.0 / (4096.0 * SERVO_PWM_FREQ)) - 1);
  if (pwm.readPrescale() != expected) recoverServoDriver();
}

void setServoPosition(int channel, int pulse) {
  int value = constrain(pulse, 120, 490);
  if (pwm.setPWM(channel, 0, value) != 0) {
    recoverServoDriver();
    pwm.setPWM(channel, 0, value);
  }
  lastServoMoveAt = millis();
  servosReleased = false;
}

// SG90s keep hunting around a held position and pick up supply noise as
// twitches, so idle positional servos get no signal at all. Gear friction
// holds them in place. The feeder is left alone: stopFeeder() already
// releases it, and a calibration preview keeps it running on purpose.
void releaseIdleServos() {
  if (servosReleased || millis() - lastServoMoveAt < SERVO_IDLE_RELEASE_MS) {
    return;
  }
  for (int m = 1; m <= maxModuleForOffset(); m++) {
    for (int s = 0; s < 3; s++) pwm.setPin(getChannel(m, s), 0);
  }
  servosReleased = true;
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
    waitMs(feederConfig.settleDuration);
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
    waitMs(feederConfig.pulseDuration > 0 ? feederConfig.pulseDuration : 200);
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
      waitMs(2);
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
      waitMs(2);
    }

    stopFeeder();
    if (digitalRead(irPin(1)) == LOW) {
      // Motor's already off - only the last card (hopper now empty) needs an extra push to fully seat it.
      if (!hopperHasCards()) {
        setServoPosition(getFeederChannel(), feederConfig.speed);
        waitMs(feederConfig.settleDuration);
        stopFeeder();
      }
      return FEED_DETECTED;
    }
    waitMs(feederConfig.pauseDuration);
  }
  return FEED_TIMEOUT;
}

// Flaps a module's paddle open/closed a few times to try to jostle a stuck
// card loose - mirrors the manual fix of flapping the side paddles by hand.
// Bails early as soon as the IR sensor sees the card clear, rather than
// finishing the full sequence for no reason.
void wiggleModulePaddle(int module) {
  ModuleConfig& c = moduleConfig[module - 1];
  int bottomChannel = getChannel(module, 0);  // front/bottom flap
  int paddleChannel = getChannel(module, 1);  // side paddle

  // Only swing the bottom flap halfway shut, so it jostles the card without
  // clamping down on it.
  int bottomHalfClosed = (c.bottomOpen + c.bottomClosed) / 2;

  for (int i = 0; i < 3; i++) {
    // Jiggle both the side paddle and front/bottom flap together.
    setServoPosition(paddleChannel, c.paddleOpen);
    setServoPosition(bottomChannel, bottomHalfClosed);
    waitMs(150);

    setServoPosition(paddleChannel, c.paddleClosed);
    setServoPosition(bottomChannel, c.bottomOpen);
    waitMs(150);

    // Stop as soon as the card clears this module.
    if (digitalRead(irPin(module)) == HIGH) return;
  }

  // routeCard() calls this recovery after the bottom has already been opened,
  // so leave the front/bottom flap open for the retry.
  setServoPosition(bottomChannel, c.bottomOpen);
  setServoPosition(paddleChannel, c.paddleClosed);
}

// Runs between commands only (routeCard()/runFeeder() block loop() for
// their duration), i.e. only while nothing is actively sorting. For each
// module, if a card sits there continuously with no route in progress,
// reports a jam once it's been there MODULE_JAM_TIMEOUT_MS - purely
// informational, no servo movement. Paddle-flap recovery is handled
// separately, inline, only while a route is actively moving a card through
// (see routeCard()) - not here. Re-arms once the sensor sees the card leave.
void checkModuleJams() {
  for (int m = 1; m <= maxModuleForOffset(); m++) {
    int i = m - 1;
    bool present = digitalRead(irPin(m)) == LOW;
    if (!present) {
      modulePresentSince[i] = 0;
      moduleJamAlerted[i] = false;
      continue;
    }
    if (modulePresentSince[i] == 0) {
      modulePresentSince[i] = millis();
      continue;
    }
    unsigned long presentFor = millis() - modulePresentSince[i];
    if (!moduleJamAlerted[i] && presentFor > MODULE_JAM_TIMEOUT_MS) {
      moduleJamAlerted[i] = true;
      char line[40];
      snprintf(line, sizeof(line), "{\"error\":\"jam\",\"module\":%d}", m);
      broadcastLine(line);
    }
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
  stopFeeder();
  for (int m = 1; m <= maxModuleForOffset(); m++) {
    ModuleConfig& c = moduleConfig[m - 1];
    setServoPosition(getChannel(m, 0), c.bottomClosed);
    waitMs(SERVO_STAGGER_MS);
    setServoPosition(getChannel(m, 1), c.paddleClosed);
    waitMs(SERVO_STAGGER_MS);
    setServoPosition(getChannel(m, 2), c.pusherNeutral);
    waitMs(SERVO_STAGGER_MS);
  }
  waitMs(200);
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

void printModuleRangeError(Print& reply) {
  reply.print(F("{\"error\":\"module must be 1 to "));
  reply.print(maxModuleForOffset());
  reply.println(F("\"}"));
}

bool feedNextCard(Print& reply) {
  FeedResult feedResult = runFeeder();
  if (feedResult == FEED_DETECTED) return true;

  reply.print(F("{\"error\":\""));
  reply.print(feedResult == FEED_EMPTY
    ? F("empty: feeder hopper is out of cards")
    : F("timeout: feeder did not deliver card to module 1"));
  reply.print(F("\",\"empty\":"));
  reply.print(feedResult == FEED_EMPTY ? F("true") : F("false"));
  reply.println(F("}"));
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
void routeCard(int targetModule, const char* direction, Print& reply) {
  if (targetModule < 1 || targetModule > maxModuleForOffset()) {
    printModuleRangeError(reply);
    return;
  }

  ensureServoDriver();
  if (!feedNextCard(reply)) return;

  bool dropBottom = strcmp(direction, "bottom") == 0;
  bool pushLeft = strcmp(direction, "left") == 0;

  for (int m = 1; m < targetModule; m++) {
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    if (!waitForCard(m + 1)) {
      // Card didn't clear module m in time - try the same paddle-flap
      // recovery used for a stuck card before giving up on this route.
      wiggleModulePaddle(m);
      if (!waitForCard(m + 1)) {
        reply.print(F("{\"error\":\"timeout: no card detected at module "));
        reply.print(m + 1);
        reply.println(F("\"}"));
        setAllNeutral();
        return;
      }
    }
  }
  if (targetModule > 1) waitMs(DELAY_CARD_ENTER);

  if (dropBottom) {
    setServoPosition(getChannel(targetModule, 0), moduleConfig[targetModule - 1].bottomOpen);
    waitMs(DELAY_PUSH);
    setAllNeutral();
    waitMs(200);

    reply.print(F("{\"status\":\"routed\",\"module\":"));
    reply.print(targetModule);
    reply.println(F(",\"direction\":\"bottom\"}"));
    return;
  }

  ModuleConfig& c = moduleConfig[targetModule - 1];
  pushCard(targetModule, pushLeft, c.pusherHoldDuration, c.paddleCloseDelay, true);

  reply.print(F("{\"status\":\"routed\",\"module\":"));
  reply.print(targetModule);
  reply.print(F(",\"direction\":\""));
  reply.print(pushLeft ? F("left") : F("right"));
  reply.println(F("\"}"));
}

// The left/right push at the end of a route, also run standalone by
// pushTest so the timings can be tuned without feeding a card.
// paddleCloseDelayMs counts from when the pusher fired, independently of
// holdMs (which only governs when the pusher itself retracts).
void pushCard(int module, bool pushLeft, int holdMs, int paddleCloseDelayMs,
              bool resetPrecedingModules) {
  ModuleConfig& c = moduleConfig[module - 1];
  setServoPosition(getChannel(module, 1), c.paddleOpen);
  waitMs(DELAY_PADDLE);
  setServoPosition(getChannel(module, 2), pushLeft ? c.pusherLeft : c.pusherRight);
  unsigned long pusherFiredAt = millis();
  waitMs(holdMs);
  setServoPosition(getChannel(module, 2), c.pusherNeutral);
  if (resetPrecedingModules) {
    for (int m = 1; m < module; m++) setModuleNeutral(m);
  }

  long paddleWait = (long)paddleCloseDelayMs - (long)(millis() - pusherFiredAt);
  if (paddleWait > 0) waitMs((unsigned long)paddleWait);
  setServoPosition(getChannel(module, 0), c.bottomClosed);
  setServoPosition(getChannel(module, 1), c.paddleClosed);
  waitMs(200);
}

// Broadcasts a line to every currently-connected transport - unlike a
// command's response (which must go back only to whichever transport asked
// for it, see feedByte()), the boot banner and the jam alert aren't a
// response to anything, so every connected client should see them.
void broadcastLine(const char* s) {
  Serial.println(s);
#if BLE_SUPPORTED
  if (bleIsConnected()) bleSendLine(s);
#endif
}

#if BLE_SUPPORTED
// Wraps the BLE TX (notify) characteristic as a Print target so handleCommand
// et al. can write a BLE-originated response the same way they'd write to
// Serial. Buffers a whole line and only hands it to bleSendLine() (which
// chunks it to the connection's MTU) once it sees the line's terminating
// '\n' - chunking a still-in-progress line would let its notify packets
// interleave with the next line's and corrupt both.
class BlePrint : public Print {
 public:
  size_t write(uint8_t c) override {
    if (c == '\n') {
      if (len > 0 && buf[len - 1] == '\r') len--;
      buf[len] = '\0';
      bleSendLine(buf);
      len = 0;
      return 1;
    }
    if (len < sizeof(buf) - 1) buf[len++] = c;
    return 1;
  }
  using Print::write;

 private:
  char buf[MAX_CMD_LEN + 1];
  uint8_t len = 0;
};
BlePrint bleReply;
#endif

// Feeds one byte into a transport's line buffer, dispatching to
// handleCommand() once a line is complete. `reply` is where that command's
// response goes - always the same transport `s` belongs to, so responses
// never cross transports (see broadcastLine() for the messages that do).
void feedByte(InputState& s, char c, Print& reply) {
  if (c == '\n' || c == '\r') {
    if (s.overflowed) {
      reply.println(F("{\"error\":\"command too long\"}"));
      s.overflowed = false;
    } else if (s.len > 0) {
      s.buf[s.len] = '\0';
      handleCommand(s.buf, reply);
    }
    s.len = 0;
  } else if (!s.overflowed) {
    if (s.len < MAX_CMD_LEN) {
      s.buf[s.len++] = c;
    } else {
      s.overflowed = true;
      s.len = 0;
    }
  }
}

void printJsonEscaped(const char* s, Print& reply) {
  for (const char* p = s; *p; p++) {
    char c = *p;
    if (c == '"' || c == '\\') {
      reply.write('\\');
      reply.write(c);
    } else if (c == '\n') {
      reply.print(F("\\n"));
    } else if (c == '\r') {
      reply.print(F("\\r"));
    } else if ((unsigned char)c >= 0x20) {
      reply.write(c);
    }
  }
}

void handleCommand(char* json, Print& reply) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    reply.print(F("{\"error\":\"invalid JSON\",\"reason\":\""));
    reply.print(err.c_str());
    reply.print(F("\",\"length\":"));
    reply.print(strlen(json));
    reply.print(F(",\"received\":\""));
    printJsonEscaped(json, reply);
    reply.println(F("\"}"));
    return;
  }

  // {"getStatus": true} — report readiness/version on demand; see
  // PROTOCOL.md for why the app sends this on every connection.
  if (doc["getStatus"].is<bool>() && doc["getStatus"].as<bool>()) {
    reply.print(F("{\"status\":\"ready\",\"version\":\""));
    reply.print(FIRMWARE_VERSION);
    reply.print(F("\",\"board\":\""));
    reply.print(BOARD_TYPE);
    reply.print(F("\",\"id\":\""));
    reply.print(deviceId);
    reply.println(F("\"}"));
    return;
  }

  // {"setChannelOffset": N} — see channel layout comment near the top.
  if (doc["setChannelOffset"].is<int>()) {
    moduleChannelOffset = doc["setChannelOffset"].as<int>();
    setAllNeutral();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (doc["test"].is<bool>() && doc["test"].as<bool>()) {
    int blockedModule = findBlockedModule();
    if (blockedModule > 0) {
      reply.print(F("{\"error\":\"module "));
      reply.print(blockedModule);
      reply.print(F(" sensor is blocked - clear the device before testing\",\"module\":"));
      reply.print(blockedModule);
      reply.println(F("}"));
      return;
    }

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
      setServoPosition(getChannel(m, 1), moduleConfig[m - 1].paddleOpen);
    }
    waitMs(DELAY_PUSH);

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherLeft);
    }
    waitMs(DELAY_PUSH);

    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 2), moduleConfig[m - 1].pusherRight);
    }
    waitMs(DELAY_PUSH);

    setAllNeutral();
    waitMs(200);

    setServoPosition(getFeederChannel(), feederConfig.speed);
    waitMs(500);
    stopFeeder();
    waitMs(200);

    reply.println(F("{\"status\":\"test_complete\"}"));
    return;
  }

  // {"neutral": true} — reset all servos
  if (doc["neutral"].is<bool>() && doc["neutral"].as<bool>()) {
    setAllNeutral();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"clearDevice": true} — flushes any physically stuck card out the
  // bottom regardless of feeder/hopper state; unlike catch-all routing,
  // doesn't call runFeeder() first.
  if (doc["clearDevice"].is<bool>() && doc["clearDevice"].as<bool>()) {
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    waitMs(DELAY_PUSH);
    setAllNeutral();
    waitMs(200);
    reply.println(F("{\"status\":\"cleared\"}"));
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError(reply);
      return;
    }
    int offset = getServoOffset(servo);
    if (offset < 0) {
      reply.println(F("{\"error\":\"servo must be bottom, paddle, or pusher\"}"));
      return;
    }
    int pulse;
    if (doc["value"].is<int>()) {
      pulse = doc["value"].as<int>();
    } else {
      pulse = getPositionPulse(module, offset, doc["position"] | "neutral");
      if (pulse < 0) {
        reply.println(F("{\"error\":\"invalid position\"}"));
        return;
      }
    }
    setServoPosition(getChannel(module, offset), pulse);
    waitMs(200);

    reply.print(F("{\"status\":\"ok\",\"servo\":\""));
    reply.print(servo);
    reply.print(F("\",\"module\":"));
    reply.print(module);
    reply.println(F("}"));
    return;
  }

  // {"channel": N, "value": V} — drive a raw PCA9685 channel directly,
  // bypassing the module/servo mapping entirely. For verifying a servo works
  // (or finding which channel a given wire is on) before it's assigned to a
  // module - the app has no way to know what's plugged into an unassigned
  // channel, so this addresses the driver board directly instead of going
  // through getChannel()/module validation like {"servo": ...} does.
  if (doc["channel"].is<int>() && doc["value"].is<int>()) {
    int channel = doc["channel"].as<int>();
    if (channel < 0 || channel > 15) {
      reply.println(F("{\"error\":\"channel must be 0 to 15\"}"));
      return;
    }
    setServoPosition(channel, doc["value"].as<int>());
    reply.print(F("{\"status\":\"ok\",\"channel\":"));
    reply.print(channel);
    reply.println(F("}"));
    return;
  }

  // {"channelStop": N} — cut PWM on a raw channel (for a continuous-rotation
  // servo under test via {"channel": ...} above, which - like the feeder -
  // doesn't stop on its own at a "neutral" pulse the way a positional servo
  // does)
  if (doc["channelStop"].is<int>()) {
    int channel = doc["channelStop"].as<int>();
    if (channel < 0 || channel > 15) {
      reply.println(F("{\"error\":\"channel must be 0 to 15\"}"));
      return;
    }
    pwm.setPin(channel, 0);
    reply.print(F("{\"status\":\"ok\",\"channel\":"));
    reply.print(channel);
    reply.println(F("}"));
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObject cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError(reply);
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
    c.paddleCloseDelay = cfg["paddleCloseDelay"] | c.paddleCloseDelay;
    c.pusherHoldDuration = cfg["pusherHoldDuration"] | c.pusherHoldDuration;

    reply.print(F("{\"status\":\"ok\",\"module\":"));
    reply.print(module);
    reply.println(F("}"));
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  if (doc["feeder"].is<bool>() && doc["feeder"].as<bool>()) {
    FeedResult result = runFeeder();
    reply.print(F("{\"status\":\"ok\",\"detected\":"));
    reply.print(result == FEED_DETECTED ? F("true") : F("false"));
    reply.print(F(",\"empty\":"));
    reply.print(result == FEED_EMPTY ? F("true") : F("false"));
    reply.println(F("}"));
    return;
  }

  // {"feederValue": N} — set raw PWM (for calibration preview, does not auto-stop)
  if (doc["feederValue"].is<int>()) {
    setServoPosition(getFeederChannel(), doc["feederValue"].as<int>());
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"feederStop": true} — stop feeder immediately
  if (doc["feederStop"].is<bool>() && doc["feederStop"].as<bool>()) {
    stopFeeder();
    reply.println(F("{\"status\":\"ok\"}"));
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
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (doc["readIR"].is<bool>() && doc["readIR"].as<bool>()) {
    reply.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      if (m > 1) reply.print(',');
      reply.print(digitalRead(irPin(m)) == LOW ? F("true") : F("false"));  // true = card present
    }
    reply.print(F("],\"hopper\":"));
    reply.print(hopperHasCards() ? F("true") : F("false"));  // true = cards remain in feeder stack
    reply.println(F("}"));
    return;
  }

  // {"route": {"module": N, "direction": "left"|"right"|"bottom"}} — see routeCard()
  if (!doc["route"].isNull()) {
    JsonObject route = doc["route"];
    int module = route["module"] | 0;
    const char* direction = route["direction"] | "";
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError(reply);
      return;
    }
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0 &&
        strcmp(direction, "bottom") != 0) {
      reply.println(F("{\"error\":\"direction must be left, right, or bottom\"}"));
      return;
    }
    routeCard(module, direction, reply);
    return;
  }

  // {"pushTest": {"module": N, "direction": "left"|"right",
  //   "pusherHoldDuration": ms, "paddleCloseDelay": ms}} - timings optional,
  // default to the module's stored config
  if (!doc["pushTest"].isNull()) {
    JsonObject test = doc["pushTest"];
    int module = test["module"] | 0;
    const char* direction = test["direction"] | "";
    if (module < 1 || module > maxModuleForOffset()) {
      printModuleRangeError(reply);
      return;
    }
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0) {
      reply.println(F("{\"error\":\"direction must be left or right\"}"));
      return;
    }
    ModuleConfig& c = moduleConfig[module - 1];
    int holdMs = constrain((int)(test["pusherHoldDuration"] | c.pusherHoldDuration), 0, 5000);
    int paddleMs = constrain((int)(test["paddleCloseDelay"] | c.paddleCloseDelay), 0, 5000);
    ensureServoDriver();
    pushCard(module, strcmp(direction, "left") == 0, holdMs, paddleMs, false);

    reply.print(F("{\"status\":\"pushed\",\"module\":"));
    reply.print(module);
    reply.print(F(",\"direction\":\""));
    reply.print(direction);
    reply.println(F("\"}"));
    return;
  }

  reply.println(F("{\"error\":\"unknown command\"}"));
}

void setup() {
#if defined(RGB_BUILTIN)
  rgbLedWrite(RGB_BUILTIN, 0, 0, RGB_BRIGHTNESS);  // blue - powered, not yet connected
#endif

  Serial.begin(9600);
  while (!Serial);

  for (int m = 0; m < MAX_MODULES; m++) {
    moduleConfig[m] = {300, 310, 300, 310, 295, 300, 305, DELAY_PUSHER_HOLD, 150};
  }

  // All MAX_MODULES pins are set up regardless of the eventual offset/module
  // count - harmless, and the app hasn't told us the offset yet.
  for (int m = 0; m < MAX_MODULES; m++) pinMode(IR_PINS[m], INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);

  initServoDriver();
  setAllNeutral();

#if defined(ARDUINO_ARCH_ESP32)
  initDeviceIdFromEspMac();
#endif

#if BLE_SUPPORTED
  bleInit();  // Uno R4 WiFi sets deviceId here, from BLE.address()
#endif

  // Nothing above set an ID - either a board with no radio at all (Uno R4
  // Minima), or a BLE co-processor that failed to respond (see bleInit()'s
  // own comment on BLE.begin() failures).
  if (deviceId[0] == '\0') {
    loadOrCreateDeviceId();
  }

  char bootLine[128];
  snprintf(bootLine, sizeof(bootLine),
           "{\"status\":\"ready\",\"version\":\"%s\",\"board\":\"%s\",\"id\":\"%s\"}",
           FIRMWARE_VERSION, BOARD_TYPE, deviceId);
  broadcastLine(bootLine);

#if !defined(ARDUINO_ARCH_ESP32)
  WDT.begin(WATCHDOG_TIMEOUT_MS);
#endif
}

void loop() {
  feedWatchdog();
  while (Serial.available()) {
    feedByte(serialInput, Serial.read(), Serial);
  }
#if BLE_SUPPORTED
  blePoll();
#endif
  checkModuleJams();
  releaseIdleServos();
#if defined(RGB_BUILTIN)
  updateStatusLed();
#endif
}