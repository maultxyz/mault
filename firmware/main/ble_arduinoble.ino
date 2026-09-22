// BLE backend for the Arduino Uno R4 WiFi, using the ArduinoBLE library
// (talks to the board's onboard ESP32-S3 co-processor - this is NOT the
// ble_esp32.ino backend, which targets a standalone ESP32-S3 running its own
// sketch directly; ArduinoBLE's API shape is entirely different from
// Bluedroid's). Implements the same bleInit()/blePoll()/bleIsConnected()/
// bleSendLine() contract as ble_esp32.ino so main.ino never branches on
// which backend is active - see main.ino's BLE_SUPPORTED/BLE_BACKEND_*
// macros for the board gating.
//
// Requires the ArduinoBLE library (added to firmware-release.yml's and
// firmware-pr-check.yml's `arduino-cli lib install` steps) - it does not
// ship with the arduino:renesas_uno core the way ESP32's BLE does with its
// core.
#if BLE_BACKEND_ARDUINOBLE
#include <ArduinoBLE.h>

// Nordic UART Service (NUS) - see ble_esp32.ino for the UUID rationale. Must
// match exactly, since the web client looks for one fixed service regardless
// of which board it's talking to.
BLEService nusService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLECharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
                          BLEWrite | BLEWriteWithoutResponse, MAX_CMD_LEN);
BLECharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLERead | BLENotify,
                          MAX_CMD_LEN);

// ArduinoBLE doesn't expose an app-level MTU request, so don't assume a
// negotiated MTU larger than the BLE default actually took effect - chunk
// conservatively at the default ATT MTU's usable payload (23-byte MTU -
// 3-byte ATT header). Verify on hardware whether this can be raised, and
// whether back-to-back writeValue() calls need the delay below (forum
// reports suggest rapid consecutive notifications can be dropped).
#define BLE_CHUNK_SIZE 20

// Manual prototype, belt-and-suspenders alongside main.ino's early
// #include <ArduinoBLE.h> - see that file's comment on why the Arduino
// builder's auto-generated prototypes need BLEDevice/BLECharacteristic
// visible before this function's first (hoisted) declaration.
void onRxWritten(BLEDevice central, BLECharacteristic characteristic);

void onRxWritten(BLEDevice central, BLECharacteristic characteristic) {
  int len = characteristic.valueLength();
  const uint8_t* value = characteristic.value();
  for (int i = 0; i < len; i++) {
    feedByte(bleInput, (char)value[i], bleReply);
  }
}

void bleInit() {
  // BLE.begin() can fail (e.g. co-processor not responding) - there's no
  // channel to report that today beyond Serial staying available regardless,
  // matching how a missing/broken Serial connection is also silently
  // tolerated elsewhere in this firmware.
  if (!BLE.begin()) return;

  // BLE.address() only returns a real value once the co-processor has
  // answered BLE.begin(), unlike ble_esp32.ino's backend, which can read its
  // factory MAC before init - so the ID/name are computed here instead. This
  // is the only source of deviceId for this board (Uno R4 WiFi has no
  // separate esp_read_mac()-style API of its own), so if BLE.begin() had
  // failed above, setup()'s EEPROM fallback (loadOrCreateDeviceId()) takes
  // over instead once it sees deviceId is still empty.
  setDeviceIdFromMac(BLE.address().c_str());
  char localName[32];
  snprintf(localName, sizeof(localName), "Mault Sorter %s", deviceId);

  BLE.setLocalName(localName);
  BLE.setAdvertisedService(nusService);
  nusService.addCharacteristic(rxChar);
  nusService.addCharacteristic(txChar);
  BLE.addService(nusService);
  rxChar.setEventHandler(BLEWritten, onRxWritten);
  BLE.advertise();
}

void blePoll() {
  // Pumps ArduinoBLE's internal event loop - this is what actually invokes
  // onRxWritten() and keeps BLE.connected()/advertising state current.
  BLE.poll();
}

bool bleIsConnected() { return BLE.connected(); }

void bleSendLine(const char* s) {
  if (!BLE.connected()) return;
  size_t len = strlen(s);
  // Chunk the line across multiple writeValue() calls, then send a trailing
  // "\n" chunk so the client's byte-stream line-splitter (the same logic it
  // already uses for Serial's byte stream) sees identical framing over BLE
  // as over USB, regardless of chunk boundaries.
  for (size_t offset = 0; offset < len; offset += BLE_CHUNK_SIZE) {
    size_t chunkLen = len - offset < BLE_CHUNK_SIZE ? len - offset : BLE_CHUNK_SIZE;
    txChar.writeValue((const uint8_t*)(s + offset), chunkLen);
    delay(10);  // verify on hardware whether this is actually needed
  }
  txChar.writeValue((const uint8_t*)"\n", 1);
}
#endif  // BLE_BACKEND_ARDUINOBLE
