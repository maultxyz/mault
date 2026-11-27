#define ARDUINOJSON_USE_LONG_LONG 0
#define ARDUINOJSON_USE_DOUBLE 0
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <Wire.h>
#include <ctype.h>
#include <Adafruit_PWMServoDriver.h>
#include <Adafruit_NeoPixel.h>
#if defined(ARDUINO_ARCH_ESP32)
#include "esp_mac.h"
#include "esp_system.h"
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

#define FIRMWARE_VERSION "2.14.1"

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

// Boards with a Wi-Fi radio can join the user's network and hold a WebSocket
// to the server (cloud_common.ino), letting the app drive the sorter from
// anywhere. Every ESP32 runs it alongside BLE (cloud_esp32.ino). The Uno R4
// WiFi's radio is the ESP32-S3 co-processor ArduinoBLE also uses, so there
// Wi-Fi and BLE take turns, one per boot (cloud_wifis3.ino).
#if defined(ARDUINO_ARCH_ESP32)
#define WIFI_SUPPORTED 1
#define WIFI_BACKEND_ESP32 1
#elif defined(ARDUINO_UNOWIFIR4)
#define WIFI_SUPPORTED 1
#define WIFI_BACKEND_WIFIS3 1
#else
#define WIFI_SUPPORTED 0
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
#if WIFI_BACKEND_ESP32
#include <NetworkClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <WiFi.h>
#elif WIFI_BACKEND_WIFIS3
#include <WiFiS3.h>
#endif

#define SERVO_DRIVER_I2C_ADDR 0x40

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(SERVO_DRIVER_I2C_ADDR);

// Short, human-distinguishable ID identifying this specific physical board -
// the same value regardless of which transport (Serial or BLE) a client
// reads it over, and stable across power cycles/resets, so the app can key a
// saved device record to a specific unit and multiple units show up as
// distinct entries in a phone/OS Bluetooth picker before ever connecting.
// Populated once from setup(), before the boot banner is printed, via the
// best source available on the board:
//   - ESP32 (any variant): the factory Wi-Fi/BT MAC (initDeviceIdFromEspMac()
//     below), read unconditionally - present on the silicon regardless of
//     whether this build even compiles in a BLE backend (see BLE_SUPPORTED).
//   - Uno R4 WiFi: also MAC-derived, but only readable after BLE.begin()
//     talks to the onboard co-processor, so it's set from inside bleInit()
//     (see ble_arduinoble.ino) instead of here. A boot where Wi-Fi owns the
//     radio never starts BLE, so it reuses the ID cached by the last BLE boot
//     (see cacheRadioDeviceId() below).
//   - Uno R4 Minima (no radio of any kind): falls back to
//     loadOrCreateDeviceId() below, which persists a random one-time-
//     generated ID to EEPROM/data flash - the only board with nothing
//     factory-unique to read.
char deviceId[7] = "";

// Name the sorter advertises over BLE and reports in getStatus, set by
// {"setName": ...} so a renamed sorter is easy to find in a Bluetooth picker.
// Empty means the default "Mault Sorter <id>". 29 bytes fills a scan
// response (31 bytes minus the 2-byte AD header), where both BLE backends
// put the name. Persisted in NVS on ESP32 and EEPROM elsewhere (see
// loadSorterName()).
#define SORTER_NAME_MAX_BYTES 29
char sorterName[SORTER_NAME_MAX_BYTES + 1] = "";

void formatAdvertisedName(char* out, size_t size) {
  if (sorterName[0] != '\0') {
    strncpy(out, sorterName, size - 1);
    out[size - 1] = '\0';
  } else {
    snprintf(out, size, "Mault Sorter %s", deviceId);
  }
}

// Formats a colon-separated MAC string ("aa:bb:cc:dd:ee:ff") into deviceId as
// its last 6 hex characters, uppercased and with colons stripped - plenty of
// entropy to tell boards apart on a bench without needing the full address.
#if BLE_BACKEND_ARDUINOBLE
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
#endif

#if defined(ARDUINO_ARCH_ESP32)
// Every ESP32 (classic or S3) has a factory-programmed Wi-Fi/BT MAC
// regardless of whether this build even compiles in the BLE backend
// (BLE_SUPPORTED is 0 for classic ESP32 - see below) - ESP_MAC_WIFI_STA is
// readable unconditionally, unlike the Uno R4 WiFi's BLE.address(), which
// needs the co-processor initialized first.
void initDeviceIdFromEspMac() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  snprintf(deviceId, sizeof(deviceId), "%02X%02X%02X", mac[3], mac[4], mac[5]);
}
#endif

#define DEVICE_ID_EEPROM_ADDR 0
// Marks that a device ID was already generated and stored, so a re-flash or
// reset doesn't hand out a fresh random one - written only once, on this
// board's actual first boot.
#define DEVICE_ID_EEPROM_MAGIC 0xA5

// Last-resort fallback for a board with no factory-unique hardware ID to
// read at all (only the Uno R4 Minima, which has no radio - see deviceId's
// comment above). A board's identity has to survive a reset or it's useless
// for keying a saved device record to a specific physical unit, so it's
// persisted to EEPROM (which the Renesas UNO R4 core emulates over its
// internal data flash), next to the stored calibration (see storeConfig in
// PROTOCOL.md).
void loadOrCreateDeviceId() {
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

#if defined(ARDUINO_UNOWIFIR4)
#define RADIO_ID_EEPROM_ADDR 8
#define RADIO_ID_EEPROM_MAGIC 0xB7

void cacheRadioDeviceId() {
  if (deviceId[0] == '\0') return;
  bool cached = EEPROM.read(RADIO_ID_EEPROM_ADDR) == RADIO_ID_EEPROM_MAGIC;
  for (int i = 0; cached && i < 6; i++) {
    cached = EEPROM.read(RADIO_ID_EEPROM_ADDR + 1 + i) == (uint8_t)deviceId[i];
  }
  if (cached) return;
  EEPROM.write(RADIO_ID_EEPROM_ADDR, 0);
  for (int i = 0; i < 6; i++) {
    EEPROM.write(RADIO_ID_EEPROM_ADDR + 1 + i, deviceId[i]);
  }
  EEPROM.write(RADIO_ID_EEPROM_ADDR, RADIO_ID_EEPROM_MAGIC);
}

void loadCachedRadioDeviceId() {
  if (EEPROM.read(RADIO_ID_EEPROM_ADDR) != RADIO_ID_EEPROM_MAGIC) return;
  for (int i = 0; i < 6; i++) {
    deviceId[i] = (char)EEPROM.read(RADIO_ID_EEPROM_ADDR + 1 + i);
  }
  deviceId[6] = '\0';
}
#endif

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
// After flapping every module for a card no sensor sees, a card that came
// loose lands well within this, and a shorter wait keeps a 4-module jam
// inside the app's 15s route timeout.
#define UNSEEN_CARD_ARRIVAL_WAIT_MS 1000
#define SERIAL_CONNECT_WAIT_MS 1500

// Every blocking wait goes through waitMs(), which keeps the watchdog fed,
// so it only fires if the board truly hangs, e.g. after a supply dip from
// servos moving together leaves the MCU or its I2C peripheral wedged. The
// reboot drops USB, so the app sees a disconnect instead of a sorter that
// silently stops answering. Uno R4 uses its hardware WDT (tops out at
// ~5.6s); ESP32 subscribes the loop task to the core's task watchdog, whose
// timeout comes from the prebuilt sdkconfig (5s).
#define WATCHDOG_TIMEOUT_MS 4000
#define SERIAL_BUFFER_SIZE 1024

#define SERVO_PWM_FREQ 50
// Gap between consecutive servo moves in setAllNeutral(), so a full reset
// doesn't start every servo at once and pull the supply down.
#define SERVO_STAGGER_MS 25

#if defined(ARDUINO_ARCH_ESP32)
// Brownout resets in a row, kept in RTC memory (survives a reset, not a power
// cycle). After BROWNOUT_SAFE_BOOTS of them setup() leaves the servos
// unpowered instead of driving them to neutral, and Wi-Fi stays paused, so a
// stalled servo or weak supply can't hold the board in a reset loop. 60 s of
// uptime clears the count.
#define BROWNOUT_SAFE_BOOTS 2
#define BROWNOUT_STABLE_UPTIME_MS 60000
#define BROWNOUT_COUNTER_MAGIC 0x4D564254
RTC_NOINIT_ATTR uint32_t brownoutCounterMagic;
RTC_NOINIT_ATTR uint32_t consecutiveBrownoutBoots;
#endif
#define SELF_TEST_MODULE_SETTLE_MS 250

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
void printFeedFailureFields(FeedResult feedResult, Print& reply);

// Largest module number whose 3 channels, plus one feeder channel right
// after it, still fit in channels [offset, 15].
int maxModuleForOffset() {
  int n = (15 - moduleChannelOffset) / 3;
  return n < 0 ? 0 : n;
}

int irPin(int module) {
  return IR_PINS[module - 1];
}

// Servo inrush can put a spike on a sensor line, so one read never decides:
// two reads IR_CONFIRM_GAP_US apart must agree, and a third breaks a tie.
#define IR_CONFIRM_GAP_US 200

bool cardPresent(int module) {
  int pin = irPin(module);
  bool first = digitalRead(pin) == LOW;
  delayMicroseconds(IR_CONFIRM_GAP_US);
  bool second = digitalRead(pin) == LOW;
  if (first == second) return first;
  delayMicroseconds(IR_CONFIRM_GAP_US);
  return digitalRead(pin) == LOW;
}

bool hopperHasCards() {
  return digitalRead(IR_PIN_HOPPER) == LOW;
}

// Module detection probes which IR sensors are wired. A plugged-in sensor
// drives its output (its own pull-up holds it HIGH, a card pulls it LOW), so
// it reads LOW under our pull-up or HIGH under a pull-down. An empty pin
// floats and follows whichever internal resistor is on. The Uno R4's RA4M1
// has no internal pull-down, so only ESP32 builds can tell them apart.
#if defined(ARDUINO_ARCH_ESP32)
#define MODULE_DETECTION_SUPPORTED 1
#define IR_PROBE_SETTLE_MS 2
#else
#define MODULE_DETECTION_SUPPORTED 0
#endif

#if MODULE_DETECTION_SUPPORTED
bool irSensorConnected(int module) {
  int pin = irPin(module);
  if (digitalRead(pin) == LOW) return true;
  pinMode(pin, INPUT_PULLDOWN);
  waitMs(IR_PROBE_SETTLE_MS);
  bool drivenHigh = digitalRead(pin) == HIGH;
  pinMode(pin, INPUT_PULLUP);
  return drivenHigh;
}
#endif

bool watchdogStarted = false;

void feedWatchdog() {
#if defined(ARDUINO_ARCH_ESP32)
  if (watchdogStarted) feedLoopWDT();
#else
  WDT.refresh();
#endif
}

const char* resetReason = "unknown";

#if defined(ARDUINO_ARCH_ESP32)
void trackBrownoutBoots() {
  if (brownoutCounterMagic != BROWNOUT_COUNTER_MAGIC) {
    brownoutCounterMagic = BROWNOUT_COUNTER_MAGIC;
    consecutiveBrownoutBoots = 0;
  }
  if (esp_reset_reason() == ESP_RST_BROWNOUT) {
    consecutiveBrownoutBoots++;
  } else {
    consecutiveBrownoutBoots = 0;
  }
}

void clearBrownoutBootsWhenStable() {
  if (consecutiveBrownoutBoots != 0 && millis() > BROWNOUT_STABLE_UPTIME_MS) {
    consecutiveBrownoutBoots = 0;
  }
}
#endif

bool bootingAfterRepeatedBrownouts() {
#if defined(ARDUINO_ARCH_ESP32)
  return consecutiveBrownoutBoots >= BROWNOUT_SAFE_BOOTS;
#else
  return false;
#endif
}

void captureResetReason() {
#if defined(ARDUINO_ARCH_ESP32)
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: resetReason = "power_on"; break;
    case ESP_RST_EXT: resetReason = "external"; break;
    case ESP_RST_SW: resetReason = "software"; break;
    case ESP_RST_PANIC: resetReason = "panic"; break;
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT: resetReason = "watchdog"; break;
    case ESP_RST_BROWNOUT:
    case ESP_RST_PWR_GLITCH: resetReason = "brownout"; break;
    case ESP_RST_USB:
    case ESP_RST_JTAG: resetReason = "usb"; break;
    default: resetReason = "other"; break;
  }
#else
  if (R_SYSTEM->RSTSR1_b.WDTRF || R_SYSTEM->RSTSR1_b.IWDTRF) {
    resetReason = "watchdog";
  } else if (R_SYSTEM->RSTSR0_b.LVD0RF || R_SYSTEM->RSTSR0_b.LVD1RF ||
             R_SYSTEM->RSTSR0_b.LVD2RF) {
    resetReason = "brownout";
  } else if (R_SYSTEM->RSTSR1_b.SWRF) {
    resetReason = "software";
  } else if (R_SYSTEM->RSTSR0_b.PORF || !R_SYSTEM->RSTSR2_b.CWSF) {
    resetReason = "power_on";
  } else {
    resetReason = "external";
  }
  R_SYSTEM->RSTSR0 = 0;
  R_SYSTEM->RSTSR1 = 0;
  R_SYSTEM->RSTSR2_b.CWSF = 1;
#endif
}

void startWatchdog() {
#if defined(ARDUINO_ARCH_ESP32)
  enableLoopWDT();
  watchdogStarted = true;
#else
  WDT.begin(WATCHDOG_TIMEOUT_MS);
#endif
}

void pumpInput();
extern bool commandInProgress;

// Set by {"stop": true}, which is accepted even mid-command (see
// handleCommand()). While set, setServoPosition() moves nothing and every
// wait returns at once, so the interrupted command unwinds without motion.
// Only {"neutral": true} clears it.
bool emergencyStopped = false;

void waitMs(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms && !emergencyStopped) {
    feedWatchdog();
    if (commandInProgress) pumpInput();
    // pumpInput() can outlast a short wait; without this check the
    // subtraction below wraps and a 2 ms wait sleeps the full 50 ms.
    unsigned long elapsed = millis() - start;
    if (elapsed >= ms) break;
    unsigned long left = ms - elapsed;
    delay(left < 50 ? left : 50);
  }
  feedWatchdog();
}

bool waitForCard(int module, int timeoutMs = IR_TIMEOUT_MS) {
  unsigned long start = millis();
  while (!cardPresent(module)) {
    if (emergencyStopped || millis() - start > (unsigned long)timeoutMs) return false;
    waitMs(5);
  }
  return true;
}

bool waitForClear(int module, int timeoutMs = IR_TIMEOUT_MS) {
  unsigned long start = millis();
  while (cardPresent(module)) {
    if (emergencyStopped || millis() - start > (unsigned long)timeoutMs) return false;
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
    if (cardPresent(m)) return m;
  }
  return 0;
}

#define DELAY_PADDLE 300  // default paddleOpenDelay: time for paddle to engage
// A pusher move this close to neutral is a nudge: it shifts the card a little
// for the app's foil check and can't reach the side paddle, so it doesn't
// lower the paddle first. It must stay within both limits: a few pulse units
// (about the 5% calibration slider step) and a share of the travel to that
// side, so pushers with short travel still keep clear of the paddle.
#define PUSHER_NUDGE_MAX_PULSE 20
#define PUSHER_NUDGE_MAX_TRAVEL_PERCENT 50

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
  int paddleOpenDelay;  // ms the paddle gets to lower before the pusher fires
};

ModuleConfig moduleConfig[MAX_MODULES];

struct FeederConfig {
  int speed;
  int duration;        // overall timeout (ms) before giving up
  int pulseDuration;    // ms per pulse; 0 = continuous feed, no pulsing
  int pauseDuration;    // ms between pulses (IR checked after each stop)
  int settleDuration;   // extra ms to feed once IR sees the card, so it
                         // clears the sensor instead of stopping right on it
  int reverseSpeed;
  int reverseDuration;
};

FeederConfig feederConfig = {315, 1000, 40, 100, 100, 295, 0};

const char* const MODULE_FIELDS[] = {
    "bottomClosed",     "bottomOpen",     "paddleClosed",
    "paddleOpen",       "pusherLeft",     "pusherNeutral",
    "pusherRight",      "pusherHoldDuration", "paddleCloseDelay",
    "paddleOpenDelay"};
const char* const FEEDER_FIELDS[] = {
    "speed",          "duration",     "pulseDuration",  "pauseDuration",
    "settleDuration", "reverseSpeed", "reverseDuration"};
#define MODULE_FIELD_COUNT (sizeof(MODULE_FIELDS) / sizeof(MODULE_FIELDS[0]))
#define FEEDER_FIELD_COUNT (sizeof(FEEDER_FIELDS) / sizeof(FEEDER_FIELDS[0]))
static_assert(sizeof(ModuleConfig) == MODULE_FIELD_COUNT * sizeof(int),
              "MODULE_FIELDS must list every ModuleConfig field");
static_assert(sizeof(FeederConfig) == FEEDER_FIELD_COUNT * sizeof(int),
              "FEEDER_FIELDS must list every FeederConfig field");

// Offsets past this leave no room for one module plus the feeder channel,
// and a negative one indexes outside the module arrays and the PCA9685's
// channel registers.
#define MAX_CHANNEL_OFFSET 12
#define MAX_CONFIG_DELAY_MS 5000
#define MAX_FEED_DURATION_MS 30000

// Manual prototypes (see FeedResult above): both take sketch-defined structs.
void sanitizeModuleConfig(ModuleConfig& c);
void sanitizeFeederConfig(FeederConfig& c);

bool channelOffsetValid(int offset) {
  return offset >= 0 && offset <= MAX_CHANNEL_OFFSET;
}

// Every duration ends up in waitMs() as an unsigned wait, so a negative one
// would block for weeks with the watchdog still being fed.
void sanitizeModuleConfig(ModuleConfig& c) {
  c.pusherHoldDuration = constrain(c.pusherHoldDuration, 0, MAX_CONFIG_DELAY_MS);
  c.paddleCloseDelay = constrain(c.paddleCloseDelay, 0, MAX_CONFIG_DELAY_MS);
  c.paddleOpenDelay = constrain(c.paddleOpenDelay, 0, MAX_CONFIG_DELAY_MS);
}

void sanitizeFeederConfig(FeederConfig& c) {
  c.duration = constrain(c.duration, 0, MAX_FEED_DURATION_MS);
  c.pulseDuration = constrain(c.pulseDuration, 0, MAX_CONFIG_DELAY_MS);
  c.pauseDuration = constrain(c.pauseDuration, 0, MAX_CONFIG_DELAY_MS);
  c.settleDuration = constrain(c.settleDuration, 0, MAX_CONFIG_DELAY_MS);
  c.reverseDuration = constrain(c.reverseDuration, 0, MAX_CONFIG_DELAY_MS);
}

void printIntFields(const char* const* names, const int* values, size_t count,
                    bool first, Print& reply) {
  for (size_t i = 0; i < count; i++) {
    if (i > 0 || !first) reply.write(',');
    reply.write('"');
    reply.print(names[i]);
    reply.print(F("\":"));
    reply.print(values[i]);
  }
}

void readIntFields(JsonObjectConst cfg, const char* const* names, int* values,
                   size_t count) {
  for (size_t i = 0; i < count; i++) values[i] = cfg[names[i]] | values[i];
}

#define CONFIG_EEPROM_ADDR 16
#define CONFIG_EEPROM_MAGIC 0xC7
#define CONFIG_EEPROM_LAYOUT 2
#define CONFIG_EEPROM_LAYOUT_V1 1

struct StoredConfig {
  int channelOffset;
  ModuleConfig modules[MAX_MODULES];
  FeederConfig feeder;
};

struct ModuleConfigV1 {
  int bottomClosed, bottomOpen;
  int paddleClosed, paddleOpen;
  int pusherLeft, pusherNeutral, pusherRight;
  int pusherHoldDuration;
  int paddleCloseDelay;
};

struct StoredConfigV1 {
  int channelOffset;
  ModuleConfigV1 modules[MAX_MODULES];
  FeederConfig feeder;
};

void captureConfig(StoredConfig& out);

#define EEPROM_SIZE (CONFIG_EEPROM_ADDR + 2 + sizeof(StoredConfig))

StoredConfig storedConfig;
bool hasStoredConfig = false;

void beginEeprom() {
#if defined(ARDUINO_ARCH_ESP32)
  EEPROM.begin(EEPROM_SIZE);
#endif
}

void captureConfig(StoredConfig& out) {
  out.channelOffset = moduleChannelOffset;
  memcpy(out.modules, moduleConfig, sizeof(moduleConfig));
  out.feeder = feederConfig;
}

bool configMatchesStored() {
  if (!hasStoredConfig) return false;
  StoredConfig current;
  captureConfig(current);
  return memcmp(&current, &storedConfig, sizeof(StoredConfig)) == 0;
}

void loadStoredConfigV1() {
  StoredConfigV1 legacy;
  EEPROM.get(CONFIG_EEPROM_ADDR + 2, legacy);
  storedConfig.channelOffset = legacy.channelOffset;
  for (int m = 0; m < MAX_MODULES; m++) {
    const ModuleConfigV1& old = legacy.modules[m];
    storedConfig.modules[m] = {old.bottomClosed, old.bottomOpen,
                               old.paddleClosed, old.paddleOpen,
                               old.pusherLeft, old.pusherNeutral, old.pusherRight,
                               old.pusherHoldDuration, old.paddleCloseDelay,
                               DELAY_PADDLE};
  }
  storedConfig.feeder = legacy.feeder;
}

void loadStoredConfig() {
  if (EEPROM.read(CONFIG_EEPROM_ADDR) != CONFIG_EEPROM_MAGIC) return;
  uint8_t layout = EEPROM.read(CONFIG_EEPROM_ADDR + 1);
  if (layout == CONFIG_EEPROM_LAYOUT) {
    EEPROM.get(CONFIG_EEPROM_ADDR + 2, storedConfig);
  } else if (layout == CONFIG_EEPROM_LAYOUT_V1) {
    loadStoredConfigV1();
  } else {
    return;
  }
  if (!channelOffsetValid(storedConfig.channelOffset)) return;
  for (int m = 0; m < MAX_MODULES; m++) sanitizeModuleConfig(storedConfig.modules[m]);
  sanitizeFeederConfig(storedConfig.feeder);
  hasStoredConfig = true;
  moduleChannelOffset = storedConfig.channelOffset;
  memcpy(moduleConfig, storedConfig.modules, sizeof(moduleConfig));
  feederConfig = storedConfig.feeder;
}

void writeEepromByte(int addr, uint8_t value) {
#if defined(ARDUINO_ARCH_ESP32)
  EEPROM.write(addr, value);
#else
  EEPROM.update(addr, value);
#endif
}

bool persistConfig() {
  StoredConfig current;
  captureConfig(current);
  if (hasStoredConfig &&
      memcmp(&current, &storedConfig, sizeof(StoredConfig)) == 0) {
    return false;
  }
  writeEepromByte(CONFIG_EEPROM_ADDR, 0);
  const uint8_t* bytes = (const uint8_t*)&current;
  for (size_t i = 0; i < sizeof(StoredConfig); i++) {
    writeEepromByte(CONFIG_EEPROM_ADDR + 2 + i, bytes[i]);
    feedWatchdog();
  }
  writeEepromByte(CONFIG_EEPROM_ADDR + 1, CONFIG_EEPROM_LAYOUT);
  writeEepromByte(CONFIG_EEPROM_ADDR, CONFIG_EEPROM_MAGIC);
#if defined(ARDUINO_ARCH_ESP32)
  EEPROM.commit();
#endif
  storedConfig = current;
  hasStoredConfig = true;
  return true;
}

#if defined(ARDUINO_ARCH_ESP32)
// NVS rather than the emulated EEPROM, whose fixed EEPROM_SIZE ends right
// after StoredConfig.
#define SORTER_NAME_PREFS_NAMESPACE "sorter"
#define SORTER_NAME_PREFS_KEY "name"

void loadSorterName() {
  Preferences prefs;
  if (!prefs.begin(SORTER_NAME_PREFS_NAMESPACE, true)) return;
  if (prefs.isKey(SORTER_NAME_PREFS_KEY)) {
    prefs.getString(SORTER_NAME_PREFS_KEY, sorterName, sizeof(sorterName));
  }
  prefs.end();
}

void storeSorterName() {
  Preferences prefs;
  if (!prefs.begin(SORTER_NAME_PREFS_NAMESPACE, false)) return;
  if (sorterName[0] == '\0') {
    prefs.remove(SORTER_NAME_PREFS_KEY);
  } else {
    prefs.putString(SORTER_NAME_PREFS_KEY, sorterName);
  }
  prefs.end();
}
#else
// Past the Uno R4 WiFi's cloud settings (512 plus their 332 bytes), inside
// the 8 KB the Renesas core emulates.
#define SORTER_NAME_EEPROM_ADDR 1024
#define SORTER_NAME_EEPROM_MAGIC 0xD5

void loadSorterName() {
  if (EEPROM.read(SORTER_NAME_EEPROM_ADDR) != SORTER_NAME_EEPROM_MAGIC) return;
  for (int i = 0; i <= SORTER_NAME_MAX_BYTES; i++) {
    sorterName[i] = (char)EEPROM.read(SORTER_NAME_EEPROM_ADDR + 1 + i);
  }
  sorterName[SORTER_NAME_MAX_BYTES] = '\0';
}

void storeSorterName() {
  writeEepromByte(SORTER_NAME_EEPROM_ADDR, 0);
  for (int i = 0; i <= SORTER_NAME_MAX_BYTES; i++) {
    writeEepromByte(SORTER_NAME_EEPROM_ADDR + 1 + i, (uint8_t)sorterName[i]);
    feedWatchdog();
  }
  writeEepromByte(SORTER_NAME_EEPROM_ADDR, SORTER_NAME_EEPROM_MAGIC);
}
#endif

void printStoredModule(int module, Print& reply) {
  reply.print(F("{\"status\":\"ok\",\"module\":"));
  reply.print(module);
  printIntFields(MODULE_FIELDS, (const int*)&storedConfig.modules[module - 1],
                 MODULE_FIELD_COUNT, false, reply);
  reply.println(F("}"));
}

void printStoredFeeder(Print& reply) {
  reply.print(F("{\"status\":\"ok\",\"feeder\":{"));
  printIntFields(FEEDER_FIELDS, (const int*)&storedConfig.feeder,
                 FEEDER_FIELD_COUNT, true, reply);
  reply.println(F("}}"));
}

// Routing delays (ms) — tune to match your hardware timing
#define DELAY_CARD_ENTER   300  // time for card to settle after target bottom opens
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
#define MAX_REPLY_LEN 384

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
#if WIFI_SUPPORTED
InputState cloudInput;
#endif

// Manual prototype: the Arduino builder's auto-generated forward
// declarations are hoisted above this point in the file (before
// InputState even exists there), which fails to compile for any function
// taking it by reference. An explicit prototype here - matching feedByte()'s
// eventual definition further down - stops the builder from generating its
// own broken one for it.
void feedByte(InputState& s, char c, Print& reply);

size_t copyLine(char* out, const char* s) {
  size_t len = strnlen(s, MAX_REPLY_LEN);
  memcpy(out, s, len);
  out[len++] = '\n';
  return len;
}

#if defined(ARDUINO_ARCH_ESP32)
template <size_t N>
struct ByteRing {
  char data[N];
  volatile size_t head = 0;
  volatile size_t tail = 0;
  portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

  void push(const uint8_t* bytes, size_t len) {
    portENTER_CRITICAL(&mux);
    for (size_t i = 0; i < len; i++) {
      size_t next = (head + 1) % N;
      if (next == tail) break;
      data[head] = (char)bytes[i];
      head = next;
    }
    portEXIT_CRITICAL(&mux);
  }

  void clear() {
    portENTER_CRITICAL(&mux);
    head = tail = 0;
    portEXIT_CRITICAL(&mux);
  }

  void drainTo(InputState& s, Print& reply) {
    for (;;) {
      char c;
      bool available = false;
      portENTER_CRITICAL(&mux);
      if (tail != head) {
        c = data[tail];
        tail = (tail + 1) % N;
        available = true;
      }
      portEXIT_CRITICAL(&mux);
      if (!available) return;
      feedByte(s, c, reply);
    }
  }
};
#endif

unsigned long modulePresentSince[MAX_MODULES] = {0};
unsigned long moduleJamAlertedFor[MAX_MODULES] = {0};

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
  // a millisecond setTimeOut, and recovers its own bus. (Its setTimeout is
  // Stream's read timeout and leaves I2C transactions at the 50 ms default.)
#if defined(ARDUINO_ARCH_ESP32)
  Wire.setTimeOut(25);
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

bool servoDriverPresent() {
  Wire.beginTransmission(SERVO_DRIVER_I2C_ADDR);
  if (Wire.endTransmission() == 0) return true;
  recoverServoDriver();
  Wire.beginTransmission(SERVO_DRIVER_I2C_ADDR);
  return Wire.endTransmission() == 0;
}

const char* servoDriverStatus() {
  return servoDriverPresent() ? "ok" : "missing";
}

unsigned long paddleOpenedAt[MAX_MODULES] = {0};

// Servo and feeder current spikes can garble an I2C write. A garbled feeder
// stop used to cost a full driver restart (tens of ms) with the feeder still
// spinning, pushing a second card in, and a second failure left it running.
// So retry once straight away (arduino-esp32 recovers its own bus), and only
// then restart the driver, up to SERVO_WRITE_ATTEMPTS writes in all.
// getStatus reports the failure count so a flaky bus shows up.
#define SERVO_WRITE_ATTEMPTS 4
unsigned long servoWriteFailures = 0;

void writeServoChannel(int channel, uint16_t off) {
  for (int attempt = 0; attempt < SERVO_WRITE_ATTEMPTS; attempt++) {
    if (attempt >= 2) recoverServoDriver();
    if (pwm.setPWM(channel, 0, off) == 0) return;
    servoWriteFailures++;
  }
}

int servoPulse(int pulse) {
  return constrain(pulse, 120, 490);
}

int moduleForChannel(int channel) {
  int rel = channel - moduleChannelOffset;
  if (rel < 0) return 0;
  int module = rel / 3 + 1;
  return module <= maxModuleForOffset() ? module : 0;
}

// True when a pusher pulse stays within PUSHER_NUDGE_MAX_PULSE of neutral and
// within PUSHER_NUDGE_MAX_TRAVEL_PERCENT of the calibrated travel towards the
// side it moves to.
bool isPusherNudge(int module, int value) {
  int neutral = servoPulse(moduleConfig[module - 1].pusherNeutral);
  int left = servoPulse(moduleConfig[module - 1].pusherLeft);
  int right = servoPulse(moduleConfig[module - 1].pusherRight);
  int side = (long)(value - neutral) * (left - neutral) > 0 ? left : right;
  long offset = abs(value - neutral);
  long travel = abs(side - neutral);
  return offset <= PUSHER_NUDGE_MAX_PULSE &&
         offset * 100 <= travel * PUSHER_NUDGE_MAX_TRAVEL_PERCENT;
}

void setServoPosition(int channel, int pulse) {
  if (emergencyStopped) return;
  int value = servoPulse(pulse);
  int module = moduleForChannel(channel);
  int slot = module ? (channel - moduleChannelOffset) % 3 : -1;
  if (slot == 2 && value != servoPulse(moduleConfig[module - 1].pusherNeutral) &&
      !isPusherNudge(module, value)) {
    lowerPaddleForPush(module);
  }
  writeServoChannel(channel, value);
  lastServoMoveAt = millis();
  servosReleased = false;

  if (slot == 1) {
    bool open = value == servoPulse(moduleConfig[module - 1].paddleOpen);
    paddleOpenedAt[module - 1] = open ? (millis() | 1) : 0;
  }
}

void lowerPaddleForPush(int module) {
  if (paddleOpenedAt[module - 1] == 0) {
    setServoPosition(getChannel(module, 1), moduleConfig[module - 1].paddleOpen);
  }
  unsigned long openDelay = (unsigned long)max(moduleConfig[module - 1].paddleOpenDelay, 0);
  unsigned long elapsed = millis() - paddleOpenedAt[module - 1];
  if (elapsed < openDelay) waitMs(openDelay - elapsed);
}

// SG90s keep hunting around a held position and pick up supply noise as
// twitches, so idle positional servos get no signal at all. Gear friction
// holds them in place. The feeder is left alone: stopFeeder() already
// releases it, and a calibration preview keeps it running on purpose.
// Adafruit's setPin() discards the I2C result, so a write dropped by a
// supply dip (servo inrush under load) left the feeder spinning at its last
// speed with nothing noticing. Write full-off directly and retry after a
// driver recovery, like setServoPosition() does for moves.
void cutServoSignal(int channel) {
  writeServoChannel(channel, 4096);
}

// Every PCA9685 channel: the feeder, every module servo and any raw channel
// under test.
void cutAllServoSignals() {
  for (int channel = 0; channel <= 15; channel++) cutServoSignal(channel);
}

void releaseAllServos() {
  for (int m = 1; m <= maxModuleForOffset(); m++) {
    for (int s = 0; s < 3; s++) cutServoSignal(getChannel(m, s));
    paddleOpenedAt[m - 1] = 0;
  }
  servosReleased = true;
}

void releaseIdleServos() {
  if (servosReleased || millis() - lastServoMoveAt < SERVO_IDLE_RELEASE_MS) {
    return;
  }
  releaseAllServos();
}

void setModuleNeutral(int module, unsigned long staggerMs) {
  ModuleConfig& c = moduleConfig[module - 1];
  const int pulses[3] = {c.bottomClosed, c.paddleClosed, c.pusherNeutral};
  for (int s = 0; s < 3; s++) {
    setServoPosition(getChannel(module, s), pulses[s]);
    if (staggerMs) waitMs(staggerMs);
  }
}

void stopFeeder() {
  cutServoSignal(getFeederChannel());  // cut PWM signal entirely to stop 360° servo
}

void runFeederReverse() {
  setServoPosition(getFeederChannel(), feederConfig.reverseSpeed);
  waitMs(feederConfig.reverseDuration);
  stopFeeder();
}

void rollBackFeeder() {
  if (feederConfig.reverseDuration <= 0 || !hopperHasCards()) return;
  runFeederReverse();
}

// The hopper sensor can blink "empty" for a moment while the stack shifts
// under the card being fed, so empty only counts once it holds for
// HOPPER_EMPTY_CONFIRM_MS.
#define HOPPER_EMPTY_CONFIRM_MS 30

bool hopperConfirmedEmpty() {
  unsigned long start = millis();
  while (millis() - start < HOPPER_EMPTY_CONFIRM_MS) {
    if (hopperHasCards() || emergencyStopped) return false;
    waitMs(2);
  }
  return !hopperHasCards();
}

// Stops the feeder the moment module 1 sees a card, and only then looks at
// the hopper. Reading the hopper first let one blink of its sensor keep the
// motor running settleDuration ms past detection, which fed a second card.
// The last card in the hopper has nothing behind it to push it fully in, so
// once the hopper's really empty, run the motor settleDuration ms more.
void settleAndStopFeeder() {
  stopFeeder();
  if (!hopperConfirmedEmpty()) {
    rollBackFeeder();
    return;
  }
  if (feederConfig.settleDuration <= 0) return;
  setServoPosition(getFeederChannel(), feederConfig.speed);
  waitMs(feederConfig.settleDuration);
  stopFeeder();
}

// Polls module 1's sensor for up to ms. Checks at least once, so a 0 ms
// wait still sees a card that's already there.
bool cardArrivesWithin(unsigned long ms) {
  unsigned long start = millis();
  for (;;) {
    if (cardPresent(1)) return true;
    if (emergencyStopped || millis() - start >= ms) return false;
    waitMs(2);
  }
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

  if (cardPresent(1)) return FEED_DETECTED;

  if (!hopperHasCards()) {
    setServoPosition(getFeederChannel(), feederConfig.speed);
    waitMs(feederConfig.pulseDuration > 0 ? feederConfig.pulseDuration : 200);
    stopFeeder();
    if (cardPresent(1)) return FEED_DETECTED;
    if (!hopperHasCards()) return FEED_EMPTY;
  }

  if (feederConfig.pulseDuration <= 0) {
    setServoPosition(getFeederChannel(), feederConfig.speed);
    while (millis() - start < (unsigned long)feederConfig.duration && !emergencyStopped) {
      if (cardPresent(1)) {
        settleAndStopFeeder();
        return FEED_DETECTED;
      }
      waitMs(2);
    }
    stopFeeder();
    return FEED_TIMEOUT;
  }

  // The pause is polled too: a card that coasts onto the sensor after the
  // pulse ends is settled like any other and doesn't wait the pause out.
  while (millis() - start < (unsigned long)feederConfig.duration && !emergencyStopped) {
    setServoPosition(getFeederChannel(), feederConfig.speed);
    bool detected = cardArrivesWithin(feederConfig.pulseDuration);
    stopFeeder();
    if (detected || cardArrivesWithin(feederConfig.pauseDuration)) {
      settleAndStopFeeder();
      return FEED_DETECTED;
    }
  }
  return FEED_TIMEOUT;
}

// Flaps a module's paddle open/closed a few times to try to jostle a stuck
// card loose - mirrors the manual fix of flapping the side paddles by hand.
// Bails early as soon as the IR sensor sees the card clear, rather than
// finishing the full sequence for no reason. For a card no sensor sees
// (arrivalModule set), it bails once arrivalModule's sensor sees the card
// instead, since this module's sensor already reads clear.
void wiggleModulePaddle(int module, int arrivalModule = 0) {
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

    // Stop as soon as the card clears this module (or reaches arrivalModule).
    if (arrivalModule == 0 && !cardPresent(module)) return;
    if (arrivalModule != 0 && cardPresent(arrivalModule)) return;
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
    bool present = cardPresent(m);
    if (!present) {
      modulePresentSince[i] = 0;
      moduleJamAlertedFor[i] = 0;
      continue;
    }
    if (modulePresentSince[i] == 0) {
      modulePresentSince[i] = millis();
      continue;
    }
    unsigned long idleSince = modulePresentSince[i] > lastServoMoveAt
      ? modulePresentSince[i]
      : lastServoMoveAt;
    unsigned long presentFor = millis() - idleSince;
    if (moduleJamAlertedFor[i] != idleSince && presentFor > MODULE_JAM_TIMEOUT_MS) {
      moduleJamAlertedFor[i] = idleSince;
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

  static bool showingDisconnected = false;

  if (!Serial) {
    if (!showingDisconnected) {
      rgbLedWrite(RGB_BUILTIN, 0, 0, RGB_BRIGHTNESS);
      showingDisconnected = true;
    }
    return;
  }
  showingDisconnected = false;

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
    setModuleNeutral(m, SERVO_STAGGER_MS);
  }
  waitMs(200);
}

void finishDrop() {
  waitMs(DELAY_PUSH);
  setAllNeutral();
}

// A bottom route only ever opens trapdoors, so closing those is the whole
// reset: no need to stagger through every paddle and pusher as well.
void closeBottomsThrough(int lastModule) {
  for (int m = 1; m <= lastModule; m++) {
    if (m > 1) waitMs(SERVO_STAGGER_MS);
    setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomClosed);
  }
  waitMs(200);
}

void testModule(int module) {
  ModuleConfig& c = moduleConfig[module - 1];
  setServoPosition(getChannel(module, 0), c.bottomOpen);
  waitMs(SERVO_STAGGER_MS);
  setServoPosition(getChannel(module, 1), c.paddleOpen);
  waitMs(DELAY_PUSH);
  setServoPosition(getChannel(module, 2), c.pusherLeft);
  waitMs(DELAY_PUSH);
  setServoPosition(getChannel(module, 2), c.pusherRight);
  waitMs(DELAY_PUSH);
  setServoPosition(getChannel(module, 2), c.pusherNeutral);
  waitMs(SERVO_STAGGER_MS);
  setServoPosition(getChannel(module, 1), c.paddleClosed);
  waitMs(SERVO_STAGGER_MS);
  setServoPosition(getChannel(module, 0), c.bottomClosed);
  waitMs(SELF_TEST_MODULE_SETTLE_MS);
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

const char* bleStatus() {
#if BLE_SUPPORTED
  return bleState();
#else
  return "none";
#endif
}

bool moduleInRange(int module, int max, Print& reply) {
  if (module >= 1 && module <= max) return true;
  reply.print(F("{\"error\":\"module must be 1 to "));
  reply.print(max);
  reply.println(F("\"}"));
  return false;
}

bool channelInRange(int channel, Print& reply) {
  if (channel >= 0 && channel <= 15) return true;
  reply.println(F("{\"error\":\"channel must be 0 to 15\"}"));
  return false;
}

void printModuleStatus(const __FlashStringHelper* status, int module,
                       const char* direction, Print& reply) {
  reply.print(F("{\"status\":\""));
  reply.print(status);
  reply.print(F("\",\"module\":"));
  reply.print(module);
  if (direction) {
    reply.print(F(",\"direction\":\""));
    reply.print(direction);
    reply.write('"');
  }
}

bool isTrue(JsonVariantConst value) {
  return value.is<bool>() && value.as<bool>();
}

void printFeedFailureFields(FeedResult feedResult, Print& reply) {
  reply.print(F("\"error\":\""));
  reply.print(feedResult == FEED_EMPTY
    ? F("empty: feeder hopper is out of cards")
    : F("timeout: feeder did not deliver card to module 1"));
  reply.print(F("\",\"empty\":"));
  reply.print(feedResult == FEED_EMPTY ? F("true") : F("false"));
  reply.println(F("}"));
}

bool feedNextCard(Print& reply) {
  FeedResult feedResult = runFeeder();
  if (feedResult == FEED_DETECTED) return true;

  reply.print(F("{"));
  printFeedFailureFields(feedResult, reply);
  setAllNeutral();
  return false;
}

void feedAndReportEvent(Print& reply) {
  FeedResult feedResult = runFeeder();
  if (feedResult == FEED_DETECTED) {
    reply.println(F("{\"event\":\"fed\",\"status\":\"ok\",\"detected\":true,\"empty\":false}"));
    return;
  }
  stopFeeder();
  reply.print(F("{\"event\":\"fed\","));
  printFeedFailureFields(feedResult, reply);
}

void printRoutedResponse(int module, const char* direction, bool feedNext, Print& reply) {
  printModuleStatus(F("routed"), module, direction, reply);
  if (feedNext) reply.print(F(",\"fedNext\":true"));
  reply.println(F("}"));
}

// "bottom" targets targetModule's own trapdoor, not a shared catch-all - a
// bin can attach "bottom" to any module. Every module before the target
// opens its bottom at once (SERVO_STAGGER_MS apart, so the servos don't all
// draw current together) and the card falls straight through to the target,
// whose bottom stays closed so the card stops there. Stopping and starting
// at each module on the way caught cards on the edges and slowed every route.
// Only then does "bottom" open the target's own trapdoor.
//
// With feedNext the next card is fed only once this one has reached the
// target: closing module 1's bottom while the card was still falling caught
// its trailing edge between modules 1 and 2, out of every sensor's view.
// DELAY_CARD_ENTER counts from the card's arrival, so the close and the feed
// already cover it and the push doesn't wait it out again.
void routeCard(int targetModule, const char* direction, bool feedNext, Print& reply) {
  ensureServoDriver();
  if (!feedNextCard(reply)) return;

  bool dropBottom = strcmp(direction, "bottom") == 0;
  bool pushLeft = strcmp(direction, "left") == 0;
  bool nextFed = false;

  if (targetModule > 1) {
    for (int m = 1; m < targetModule; m++) {
      if (m > 1) waitMs(SERVO_STAGGER_MS);
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
    }
    int stuckModule = dropCardThroughToModule(targetModule);
    unsigned long arrivedAt = millis();
    if (stuckModule != 0) {
      reply.print(F("{\"error\":\"timeout: no card detected at module "));
      reply.print(stuckModule + 1);
      reply.println(F("\"}"));
      setAllNeutral();
      return;
    }
    if (feedNext && waitForClear(1)) {
      setModuleNeutral(1, 0);
      waitMs(200);
      feedAndReportEvent(reply);
      nextFed = true;
    }
    unsigned long sinceArrival = millis() - arrivedAt;
    if (sinceArrival < DELAY_CARD_ENTER) waitMs(DELAY_CARD_ENTER - sinceArrival);
  }

  if (dropBottom) {
    setServoPosition(getChannel(targetModule, 0), moduleConfig[targetModule - 1].bottomOpen);
    waitMs(DELAY_PUSH);
    closeBottomsThrough(targetModule);
  } else {
    ModuleConfig& c = moduleConfig[targetModule - 1];
    pushCard(targetModule, pushLeft, c.paddleOpenDelay, c.pusherHoldDuration,
             c.paddleCloseDelay, true);
  }

  if (feedNext && !nextFed) feedAndReportEvent(reply);
  printRoutedResponse(targetModule, direction, feedNext, reply);
}

// Waits for a card falling through the open modules before targetModule to
// land there. If it doesn't, finds the module it's caught in, flaps that
// module's paddle (the same recovery jam handling uses) and waits again, up
// to once per module on the way. Returns 0 once the card arrives, else the
// module it's still caught in (or the one just above the target when no
// sensor on the way sees it).
//
// A card can also stop between two sensors (it left module 1 but hangs
// above module 2), where no sensor sees it. Then every module on the way is
// flapped once, top down, until the target sees the card. That happens once
// per route, followed by a short wait (UNSEEN_CARD_ARRIVAL_WAIT_MS).
int dropCardThroughToModule(int targetModule) {
  if (waitForCard(targetModule)) return 0;
  bool flappedForUnseenCard = false;
  for (int attempt = 1; attempt < targetModule; attempt++) {
    int stuckModule = findCardBeforeModule(targetModule);
    if (stuckModule != 0) {
      wiggleModulePaddle(stuckModule);
    } else if (!flappedForUnseenCard) {
      flappedForUnseenCard = true;
      for (int m = 1; m < targetModule; m++) {
        wiggleModulePaddle(m, targetModule);
        if (cardPresent(targetModule)) return 0;
      }
      if (waitForCard(targetModule, UNSEEN_CARD_ARRIVAL_WAIT_MS)) return 0;
      continue;
    } else {
      break;
    }
    if (waitForCard(targetModule)) return 0;
  }
  int stuckModule = findCardBeforeModule(targetModule);
  return stuckModule != 0 ? stuckModule : targetModule - 1;
}

// The last module before targetModule whose sensor sees a card, or 0.
int findCardBeforeModule(int targetModule) {
  for (int m = targetModule - 1; m >= 1; m--) {
    if (cardPresent(m)) return m;
  }
  return 0;
}

// The left/right push at the end of a route, also run standalone by
// pushTest so the timings can be tuned without feeding a card.
// paddleOpenDelayMs is how long the paddle gets to lower before the pusher
// fires. paddleCloseDelayMs counts from when the pusher fired, independently
// of holdMs (which only governs when the pusher itself retracts).
void pushCard(int module, bool pushLeft, int paddleOpenDelayMs, int holdMs,
              int paddleCloseDelayMs, bool resetPrecedingModules) {
  ModuleConfig& c = moduleConfig[module - 1];
  // setServoPosition() holds a pusher back until the paddle has had the
  // module's paddleOpenDelay, so a pushTest trying a shorter delay swaps it
  // in for the push.
  int configuredOpenDelay = c.paddleOpenDelay;
  c.paddleOpenDelay = paddleOpenDelayMs;
  setServoPosition(getChannel(module, 1), c.paddleOpen);
  waitMs(paddleOpenDelayMs);
  setServoPosition(getChannel(module, 2), pushLeft ? c.pusherLeft : c.pusherRight);
  c.paddleOpenDelay = configuredOpenDelay;
  unsigned long pusherFiredAt = millis();
  waitMs(holdMs);
  setServoPosition(getChannel(module, 2), c.pusherNeutral);
  if (resetPrecedingModules) {
    for (int m = 1; m < module; m++) {
      if (m > 1) waitMs(SERVO_STAGGER_MS);
      setModuleNeutral(m, 0);
    }
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
#if WIFI_SUPPORTED
  if (cloudIsConnected()) cloudSendLine(s);
#endif
}

// A Print target that buffers a whole line and hands it to `send` once the
// line's terminating '\n' arrives. BLE chunks each line to the connection's
// MTU and Wi-Fi sends one WebSocket message per line, so handing either a
// still-in-progress line would let it interleave with the next one.
class LinePrint : public Print {
 public:
  explicit LinePrint(void (*send)(const char*)) : send(send) {}

  size_t write(uint8_t c) override {
    if (c == '\n') {
      if (len > 0 && buf[len - 1] == '\r') len--;
      buf[len] = '\0';
      send(buf);
      len = 0;
      return 1;
    }
    if (len < sizeof(buf) - 1) buf[len++] = c;
    return 1;
  }
  using Print::write;

 private:
  void (*send)(const char*);
  char buf[MAX_REPLY_LEN + 1];
  uint16_t len = 0;
};
#if BLE_SUPPORTED
LinePrint bleReply(bleSendLine);
#endif
#if WIFI_SUPPORTED
LinePrint cloudReply(cloudSendLine);
#endif

// Feeds one byte into a transport's line buffer, dispatching to
// handleCommand() once a line is complete. `reply` is where that command's
// response goes - always the same transport `s` belongs to, so responses
// never cross transports (see broadcastLine() for the messages that do).
void feedByte(InputState& s, char c, Print& reply) {
  if (c == '\n' || c == '\r') {
    bool overflowed = s.overflowed;
    uint8_t len = s.len;
    s.overflowed = false;
    s.len = 0;
    if (overflowed) {
      reply.println(F("{\"error\":\"command too long\"}"));
    } else if (len > 0) {
      s.buf[len] = '\0';
      handleCommand(s.buf, reply);
    }
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

class SeqPrint : public Print {
 public:
  SeqPrint(Print& out, bool hasSeq, uint32_t seq) : out(out), hasSeq(hasSeq), seq(seq) {}

  size_t write(uint8_t c) override { return write(&c, 1); }

  size_t write(const uint8_t* buffer, size_t size) override {
    size_t start = 0;
    for (size_t i = 0; i < size; i++) {
      bool tagHere = hasSeq && atLineStart && buffer[i] == '{';
      atLineStart = buffer[i] == '\n';
      if (!tagHere) continue;
      out.write(buffer + start, i + 1 - start);
      out.print(F("\"seq\":"));
      out.print(seq);
      out.write(',');
      start = i + 1;
    }
    if (start < size) out.write(buffer + start, size - start);
    return size;
  }
  using Print::write;

 private:
  Print& out;
  bool hasSeq;
  uint32_t seq;
  bool atLineStart = true;
};

// Drops everything the interrupted command still prints once an emergency
// stop lands, so its only remaining line is the {"error":"stopped"} that
// handleCommand() prints for it. A stop is only read inside waitMs(), never
// mid-line, so no half-written line gets cut. A command that starts while the
// stop is already latched (getStatus, config writes...) isn't the interrupted
// one, so it passes `armed = false` and its reply goes out as normal.
class StopAwarePrint : public Print {
 public:
  StopAwarePrint(Print& out, bool armed) : out(out), armed(armed) {}

  size_t write(uint8_t c) override { return write(&c, 1); }

  size_t write(const uint8_t* buffer, size_t size) override {
    if (armed && emergencyStopped) return size;
    return out.write(buffer, size);
  }
  using Print::write;

 private:
  Print& out;
  bool armed;
};

bool commandInProgress = false;

void runCommand(JsonDocument& doc, Print& reply);

// Cuts the signal on every PCA9685 channel (feeder, every module servo and
// any raw channel under test), so nothing keeps moving or holding.
void emergencyStop() {
  emergencyStopped = true;
  cutAllServoSignals();
  for (int m = 1; m <= maxModuleForOffset(); m++) paddleOpenedAt[m - 1] = 0;
  servosReleased = true;
}

// Commands that move a servo or the feeder. While emergencyStopped they're
// refused with {"error":"stopped"} until {"neutral": true} resets the
// sorter; reads, config writes and the stop commands still run.
// setChannelOffset runs too (every app connection sends it) but its neutral
// move is skipped by setServoPosition() while stopped.
bool isMotionCommand(JsonDocument& doc) {
  return isTrue(doc["test"]) || isTrue(doc["clearDevice"]) ||
         isTrue(doc["retractCard"]) || !doc["servo"].isNull() ||
         (doc["channel"].is<int>() && doc["value"].is<int>()) ||
         isTrue(doc["feeder"]) || doc["feederValue"].is<int>() ||
         !doc["route"].isNull() || !doc["pushTest"].isNull();
}

void handleCommand(const char* json, Print& reply) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  bool hasSeq = !err && doc["seq"].is<uint32_t>();
  SeqPrint tagged(reply, hasSeq, hasSeq ? doc["seq"].as<uint32_t>() : 0);
  // {"stop": true} — emergency stop, the one command accepted while another
  // is in progress. See PROTOCOL.md.
  if (!err && isTrue(doc["stop"])) {
    emergencyStop();
    tagged.println(F("{\"status\":\"stopped\"}"));
    return;
  }
  if (commandInProgress) {
    tagged.println(F("{\"error\":\"busy\",\"reason\":\"another command is in progress\"}"));
    return;
  }
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
  if (emergencyStopped && isMotionCommand(doc)) {
    tagged.println(F("{\"error\":\"stopped\"}"));
    return;
  }
  bool stoppedBefore = emergencyStopped;
  StopAwarePrint guarded(tagged, !stoppedBefore);
  commandInProgress = true;
  runCommand(doc, guarded);
  commandInProgress = false;
  if (!stoppedBefore && emergencyStopped) {
    tagged.println(F("{\"error\":\"stopped\"}"));
  }
}

void printStatus(Print& reply, bool live) {
  reply.print(F("{\"status\":\"ready\",\"version\":\"" FIRMWARE_VERSION
                "\",\"board\":\"" BOARD_TYPE "\",\"id\":\""));
  reply.print(deviceId);
  char advertisedName[SORTER_NAME_MAX_BYTES + 1];
  formatAdvertisedName(advertisedName, sizeof(advertisedName));
  reply.print(F("\",\"name\":\""));
  printJsonEscaped(advertisedName, reply);
  reply.print(F("\",\"ble\":\""));
  reply.print(bleStatus());
  reply.print(F("\",\"resetReason\":\""));
  reply.print(resetReason);
  reply.print(F("\",\"servoDriver\":\""));
  reply.print(servoDriverStatus());
  reply.write('"');
  // The app sizes its foil nudge from these and won't nudge without them, so
  // a nudge never lowers the side paddle on firmware with tighter limits.
  reply.print(F(",\"pusherNudgeMaxPulse\":"));
  reply.print(PUSHER_NUDGE_MAX_PULSE);
  reply.print(F(",\"pusherNudgeMaxTravelPercent\":"));
  reply.print(PUSHER_NUDGE_MAX_TRAVEL_PERCENT);
  if (emergencyStopped) reply.print(F(",\"stopped\":true"));
  if (live) {
    reply.print(F(",\"uptimeMs\":"));
    reply.print(millis());
    reply.print(F(",\"servoWriteFailures\":"));
    reply.print(servoWriteFailures);
#if BLE_SUPPORTED
    if (bleMtu() > 0) {
      reply.print(F(",\"bleMtu\":"));
      reply.print(bleMtu());
    }
#endif
#if WIFI_SUPPORTED
    reply.print(F(",\"wifi\":\""));
    reply.print(wifiStateName());
    reply.print(F("\",\"cloud\":\""));
    reply.print(cloudStateName());
    reply.write('"');
#endif
  }
  reply.println(F("}"));
}

void printBool(bool value, Print& reply) {
  reply.print(value ? F("true") : F("false"));
}

void pumpInput() {
  while (Serial.available()) {
    feedByte(serialInput, Serial.read(), Serial);
  }
#if BLE_SUPPORTED
  blePoll();
#endif
#if WIFI_SUPPORTED
  cloudPoll();
#endif
}

void runCommand(JsonDocument& doc, Print& reply) {
  // {"getStatus": true} — report readiness/version on demand; see
  // PROTOCOL.md for why the app sends this on every connection.
  if (isTrue(doc["getStatus"])) {
    printStatus(reply, true);
    return;
  }

#if WIFI_SUPPORTED
  if (handleCloudCommand(doc, reply)) return;
#endif

  if (handleLedCommand(doc, reply)) return;

  // {"setName": "Kitchen sorter"} - see PROTOCOL.md. An empty name goes back
  // to the default "Mault Sorter <id>".
  if (doc["setName"].is<const char*>()) {
    const char* name = doc["setName"].as<const char*>();
    if (strlen(name) > SORTER_NAME_MAX_BYTES) {
      reply.println(F("{\"error\":\"name must be up to 29 bytes\"}"));
      return;
    }
    if (strcmp(name, sorterName) != 0) {
      strcpy(sorterName, name);
      storeSorterName();
#if BLE_SUPPORTED
      bleUpdateName();
#endif
    }
    char advertisedName[SORTER_NAME_MAX_BYTES + 1];
    formatAdvertisedName(advertisedName, sizeof(advertisedName));
    reply.print(F("{\"status\":\"ok\",\"name\":\""));
    printJsonEscaped(advertisedName, reply);
    reply.println(F("\"}"));
    return;
  }

  // {"setChannelOffset": N} — see channel layout comment near the top.
  if (doc["setChannelOffset"].is<int>()) {
    int offset = doc["setChannelOffset"].as<int>();
    if (!channelOffsetValid(offset)) {
      reply.println(F("{\"error\":\"channel offset must be 0 to 12\"}"));
      return;
    }
    moduleChannelOffset = offset;
    setAllNeutral();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"test": true} — run a full mechanical test sequence then confirm connection
  if (isTrue(doc["test"])) {
    if (!servoDriverPresent()) {
      reply.println(F("{\"error\":\"servo driver not detected - check the PCA9685 I2C wiring and power\",\"servoDriver\":\"missing\"}"));
      return;
    }
    ensureServoDriver();

    int blockedModule = findBlockedModule();
    if (blockedModule > 0) {
      reply.print(F("{\"error\":\"module "));
      reply.print(blockedModule);
      reply.print(F(" sensor is blocked - clear the device before testing\",\"module\":"));
      reply.print(blockedModule);
      reply.println(F("}"));
      return;
    }

    setAllNeutral();
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      testModule(m);
    }

    setServoPosition(getFeederChannel(), feederConfig.speed);
    waitMs(500);
    stopFeeder();
    waitMs(200);

    reply.println(F("{\"status\":\"test_complete\"}"));
    return;
  }

  // {"neutral": true} — reset all servos; also the reset after an emergency
  // stop
  if (isTrue(doc["neutral"])) {
    emergencyStopped = false;
    setAllNeutral();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"clearDevice": true} — flushes any physically stuck card out the
  // bottom regardless of feeder/hopper state; unlike catch-all routing,
  // doesn't call runFeeder() first.
  if (isTrue(doc["clearDevice"])) {
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      setServoPosition(getChannel(m, 0), moduleConfig[m - 1].bottomOpen);
      waitMs(SERVO_STAGGER_MS);
    }
    finishDrop();
    reply.println(F("{\"status\":\"cleared\"}"));
    return;
  }

  // {"retractCard": true} - runs the feeder backward with the rollback
  // settings (reverseSpeed for reverseDuration ms) to pull a partly fed card
  // back into the hopper, whether or not the hopper sensor sees cards.
  if (isTrue(doc["retractCard"])) {
    if (feederConfig.reverseDuration <= 0) {
      reply.println(F("{\"error\":\"rollback_off\"}"));
      return;
    }
    runFeederReverse();
    reply.println(F("{\"status\":\"retracted\"}"));
    return;
  }

  // {"servo": "paddle", "module": 1, "position": "left"}
  // {"servo": "bottom", "module": 1, "value": 220}  — raw PWM for calibration
  if (!doc["servo"].isNull()) {
    const char* servo = doc["servo"];
    int module = doc["module"] | 0;
    if (!moduleInRange(module, maxModuleForOffset(), reply)) return;
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
    if (!channelInRange(channel, reply)) return;
    int value = doc["value"].as<int>();
    setServoPosition(channel, value);
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
    if (!channelInRange(channel, reply)) return;
    cutServoSignal(channel);
    reply.print(F("{\"status\":\"ok\",\"channel\":"));
    reply.print(channel);
    reply.println(F("}"));
    return;
  }

  // {"setConfig": {"module": 1, "bottomClosed": 150, ...}}
  if (!doc["setConfig"].isNull()) {
    JsonObjectConst cfg = doc["setConfig"];
    int module = cfg["module"] | 0;
    if (!moduleInRange(module, maxModuleForOffset(), reply)) return;
    ModuleConfig& c = moduleConfig[module - 1];
    readIntFields(cfg, MODULE_FIELDS, (int*)&c, MODULE_FIELD_COUNT);
    sanitizeModuleConfig(c);

    printModuleStatus(F("ok"), module, nullptr, reply);
    reply.println(F("}"));
    return;
  }

  // {"feeder": true} — run feeder until module 1 IR detects a card (or timeout/empty hopper)
  // "requireEmptyModuleOne": true (2.13.4+) refuses when module 1 already
  // holds a card. A plain feed succeeds at once in that case, so after a
  // routed card that never left module 1 the app would scan it again.
  if (isTrue(doc["feeder"])) {
    if (isTrue(doc["requireEmptyModuleOne"]) && cardPresent(1)) {
      reply.println(F("{\"error\":\"module 1 still holds a card\",\"moduleOneLoaded\":true}"));
      return;
    }
    FeedResult result = runFeeder();
    reply.print(F("{\"status\":\"ok\",\"detected\":"));
    printBool(result == FEED_DETECTED, reply);
    reply.print(F(",\"empty\":"));
    printBool(result == FEED_EMPTY, reply);
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
  if (isTrue(doc["feederStop"])) {
    stopFeeder();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  // {"setFeederConfig": {"speed": N, "duration": N, "pulseDuration": N, "pauseDuration": N, "settleDuration": N, "reverseSpeed": N, "reverseDuration": N}}
  if (!doc["setFeederConfig"].isNull()) {
    readIntFields(doc["setFeederConfig"], FEEDER_FIELDS, (int*)&feederConfig,
                  FEEDER_FIELD_COUNT);
    sanitizeFeederConfig(feederConfig);
    stopFeeder();
    reply.println(F("{\"status\":\"ok\"}"));
    return;
  }

  if (isTrue(doc["getStoredConfig"])) {
    reply.print(F("{\"status\":\"ok\",\"stored\":"));
    printBool(hasStoredConfig, reply);
    reply.print(F(",\"dirty\":"));
    printBool(!configMatchesStored(), reply);
    if (hasStoredConfig) {
      reply.print(F(",\"channelOffset\":"));
      reply.print(storedConfig.channelOffset);
      reply.print(F(",\"modules\":"));
      reply.print(MAX_MODULES);
    }
    reply.println(F("}"));
    return;
  }
  if (!doc["getStoredConfig"].isNull() && !doc["getStoredConfig"].is<bool>()) {
    if (!hasStoredConfig) {
      reply.println(F("{\"error\":\"no stored config\"}"));
      return;
    }
    if (doc["getStoredConfig"].is<int>()) {
      int module = doc["getStoredConfig"].as<int>();
      if (!moduleInRange(module, MAX_MODULES, reply)) return;
      printStoredModule(module, reply);
      return;
    }
    const char* section = doc["getStoredConfig"] | "";
    if (strcmp(section, "feeder") == 0) {
      printStoredFeeder(reply);
      return;
    }
    reply.println(F("{\"error\":\"getStoredConfig must be true, feeder or a module number\"}"));
    return;
  }

  if (isTrue(doc["storeConfig"])) {
    bool written = persistConfig();
    reply.print(F("{\"status\":\"ok\",\"written\":"));
    printBool(written, reply);
    reply.println(F("}"));
    return;
  }

  // {"readIR": true} — read current IR sensor state for all modules + hopper
  if (isTrue(doc["readIR"])) {
    reply.print(F("{\"status\":\"ok\",\"ir\":["));
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      if (m > 1) reply.print(',');
      printBool(cardPresent(m), reply);  // true = card present
    }
    reply.print(F("],\"hopper\":"));
    printBool(hopperHasCards(), reply);  // true = cards remain in feeder stack
    reply.println(F("}"));
    return;
  }

  // {"detectModules": true} - count modules from the IR sensors that are
  // wired, from module 1 up to the first missing one. "sensors" lists every
  // addressable module so the app can show gaps.
  if (isTrue(doc["detectModules"])) {
#if MODULE_DETECTION_SUPPORTED
    bool connected[MAX_MODULES] = {false};
    int detected = 0;
    bool contiguous = true;
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      connected[m - 1] = irSensorConnected(m);
      if (!connected[m - 1]) contiguous = false;
      if (contiguous) detected = m;
    }
    reply.print(F("{\"status\":\"ok\",\"modules\":"));
    reply.print(detected);
    reply.print(F(",\"sensors\":["));
    for (int m = 1; m <= maxModuleForOffset(); m++) {
      if (m > 1) reply.print(',');
      printBool(connected[m - 1], reply);
    }
    reply.println(F("]}"));
#else
    reply.println(F("{\"error\":\"module detection unsupported\"}"));
#endif
    return;
  }

  // {"route": {"module": N, "direction": "left"|"right"|"bottom", "feedNext": bool}} — see routeCard()
  if (!doc["route"].isNull()) {
    JsonObjectConst route = doc["route"];
    int module = route["module"] | 0;
    const char* direction = route["direction"] | "";
    if (!moduleInRange(module, maxModuleForOffset(), reply)) return;
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0 &&
        strcmp(direction, "bottom") != 0) {
      reply.println(F("{\"error\":\"direction must be left, right, or bottom\"}"));
      return;
    }
    // "requireLoaded": true (2.13.4+): a scan route is for the card the app
    // just scanned. routeCard() would run the feeder when module 1 is empty
    // and sort an unscanned card, so refuse before anything moves.
    if (isTrue(route["requireLoaded"]) && !cardPresent(1)) {
      reply.println(F("{\"error\":\"no card loaded at module 1\",\"noLoadedCard\":true}"));
      return;
    }
    routeCard(module, direction, route["feedNext"] | false, reply);
    return;
  }

  // {"pushTest": {"module": N, "direction": "left"|"right",
  //   "paddleOpenDelay": ms, "pusherHoldDuration": ms, "paddleCloseDelay": ms}}
  //   - timings optional,
  // default to the module's stored config
  if (!doc["pushTest"].isNull()) {
    JsonObjectConst test = doc["pushTest"];
    int module = test["module"] | 0;
    const char* direction = test["direction"] | "";
    if (!moduleInRange(module, maxModuleForOffset(), reply)) return;
    if (strcmp(direction, "left") != 0 && strcmp(direction, "right") != 0) {
      reply.println(F("{\"error\":\"direction must be left or right\"}"));
      return;
    }
    ModuleConfig& c = moduleConfig[module - 1];
    int holdMs = constrain((int)(test["pusherHoldDuration"] | c.pusherHoldDuration), 0, 5000);
    int paddleMs = constrain((int)(test["paddleCloseDelay"] | c.paddleCloseDelay), 0, 5000);
    int openMs = constrain((int)(test["paddleOpenDelay"] | c.paddleOpenDelay), 0, 5000);
    ensureServoDriver();
    pushCard(module, strcmp(direction, "left") == 0, openMs, holdMs, paddleMs, false);

    printModuleStatus(F("pushed"), module, direction, reply);
    reply.println(F("}"));
    return;
  }

  reply.println(F("{\"error\":\"unknown command\"}"));
}

void setup() {
  captureResetReason();
#if defined(ARDUINO_ARCH_ESP32)
  trackBrownoutBoots();
#endif
#if defined(RGB_BUILTIN)
  rgbLedWrite(RGB_BUILTIN, 0, 0, RGB_BRIGHTNESS);  // blue - powered, not yet connected
#endif

  // The PCA9685 keeps its outputs through an MCU reset, so a brownout or
  // watchdog reset mid-feed leaves the feeder spinning. Cut every channel
  // before anything slow (the Serial wait below) can let it push cards in.
  // A missing driver is skipped so the boot doesn't sit through a driver
  // recovery per channel.
  initServoDriver();
  if (servoDriverPresent()) cutAllServoSignals();

#if defined(ARDUINO_ARCH_ESP32) && ARDUINO_USB_MODE && ARDUINO_USB_CDC_ON_BOOT
  Serial.setRxBufferSize(SERIAL_BUFFER_SIZE);
  Serial.setTxBufferSize(SERIAL_BUFFER_SIZE);
#endif
  Serial.begin(9600);
  unsigned long serialWaitStart = millis();
  while (!Serial && millis() - serialWaitStart < SERIAL_CONNECT_WAIT_MS) delay(10);
#if defined(ARDUINO_ARCH_ESP32) && ARDUINO_USB_MODE && ARDUINO_USB_CDC_ON_BOOT
  Serial.setTxTimeoutMs(0);
#endif

  for (int m = 0; m < MAX_MODULES; m++) {
    moduleConfig[m] = {300, 310, 300, 310, 295, 300, 305, DELAY_PUSHER_HOLD, 150, DELAY_PADDLE};
  }
  beginEeprom();
  loadStoredConfig();
  loadSorterName();

  // All MAX_MODULES pins are set up regardless of the eventual offset/module
  // count - harmless, and the app hasn't told us the offset yet.
  for (int m = 0; m < MAX_MODULES; m++) pinMode(IR_PINS[m], INPUT_PULLUP);
  pinMode(IR_PIN_HOPPER, INPUT_PULLUP);
  ledsInit();

  // The PCA9685 can keep driving a stalled servo through an MCU reset, so a
  // brownout loop cuts every signal rather than just skipping the move. The
  // next command that moves a servo powers it again.
  if (bootingAfterRepeatedBrownouts()) {
    stopFeeder();
    releaseAllServos();
  } else {
    setAllNeutral();
  }

#if defined(ARDUINO_ARCH_ESP32)
  initDeviceIdFromEspMac();
#endif

#if BLE_SUPPORTED && WIFI_SUPPORTED
  if (!cloudOwnsRadio()) bleInit();
#elif BLE_SUPPORTED
  bleInit();
#endif
#if defined(ARDUINO_UNOWIFIR4)
  // Uno R4 WiFi: bleInit() set deviceId from BLE.address(), unless Wi-Fi
  // owns the radio this boot.
  if (deviceId[0] == '\0') {
    loadCachedRadioDeviceId();
  } else {
    cacheRadioDeviceId();
  }
#endif
#if WIFI_SUPPORTED
  cloudInit();
#endif

  // Nothing above set an ID - either a board with no radio at all (Uno R4
  // Minima), or a BLE co-processor that failed to respond (see bleInit()'s
  // own comment on BLE.begin() failures).
  if (deviceId[0] == '\0') {
    loadOrCreateDeviceId();
  }

  LinePrint banner(broadcastLine);
  printStatus(banner, false);

  startWatchdog();
}

void loop() {
  feedWatchdog();
#if defined(ARDUINO_ARCH_ESP32)
  clearBrownoutBootsWhenStable();
#endif
  pumpInput();
  checkModuleJams();
  releaseIdleServos();
#if defined(RGB_BUILTIN)
  updateStatusLed();
#endif
  // Lets the core idle between passes instead of spinning flat out.
  delay(1);
}