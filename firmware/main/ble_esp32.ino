// BLE backend for ESP32-S3, using the Bluedroid stack bundled with the
// esp32:esp32 Arduino core (BLEDevice/BLEServer/BLECharacteristic - already
// installed by firmware-release.yml/firmware-pr-check.yml's `arduino-cli
// core install esp32:esp32`, no extra library needed). Implements the same
// bleInit()/blePoll()/bleIsConnected()/bleSendLine() contract as
// ble_arduinoble.ino so main.ino never branches on which backend is active -
// see main.ino's BLE_SUPPORTED/BLE_BACKEND_* macros for the board gating.
#if BLE_BACKEND_ESP32
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

// Nordic UART Service (NUS) - a widely-recognized BLE "serial" convention,
// reused here (rather than inventing our own UUIDs) so generic BLE terminal
// apps (nRF Connect etc.) can talk to this device for debugging without any
// app-specific tooling. RX = commands in (write), TX = responses/unsolicited
// messages out (notify) - see PROTOCOL.md's BLE Transport section. Must
// match ble_arduinoble.ino's UUIDs exactly, since the web client looks for
// one fixed service regardless of which board it's talking to.
#define BLE_SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_RX_UUID "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_TX_UUID "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// BLEDevice::setMTU()'s actual effect has shifted across arduino-esp32 core
// versions (CI installs whatever's latest, unpinned - see BLE_SUPPORTED's
// comment in main.ino), so don't rely on a negotiated larger MTU actually
// taking effect. Chunk conservatively at the default ATT MTU's usable
// payload (23-byte MTU - 3-byte ATT header) instead - verify on hardware
// whether this can safely be raised.
#define BLE_CHUNK_SIZE 20

BLEServer* bleServer = nullptr;
BLECharacteristic* bleTxChar = nullptr;
volatile bool bleConnected = false;

class SorterServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override { bleConnected = true; }
  void onDisconnect(BLEServer* server) override {
    bleConnected = false;
    // Bluedroid stops advertising once connected and doesn't resume on its
    // own - restart it so a disconnected (or different) central can
    // reconnect without a power cycle.
    server->getAdvertising()->start();
  }
};

class SorterRxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = characteristic->getValue();
    for (size_t i = 0; i < value.length(); i++) {
      feedByte(bleInput, value[i], bleReply);
    }
  }
};

void bleInit() {
  // deviceId is already populated by main.ino's setup() (via
  // initDeviceIdFromEspMac(), called before bleInit()) - reused here rather
  // than re-reading the MAC, since the Arduino BLE library's device-name API
  // varies across esp32-arduino core versions and it's simplest to just fold
  // the already-known ID into the name up front instead of depending on
  // being able to rename the device post-init.
  char localName[32];
  snprintf(localName, sizeof(localName), "Mault Sorter %s", deviceId);

  BLEDevice::init(localName);
  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new SorterServerCallbacks());

  BLEService* service = bleServer->createService(BLE_SERVICE_UUID);

  BLECharacteristic* rxChar = service->createCharacteristic(
      BLE_RX_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rxChar->setCallbacks(new SorterRxCallbacks());

  bleTxChar =
      service->createCharacteristic(BLE_TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  // Required for notify() to actually reach a central - without a CCCD
  // descriptor present, some clients (and the underlying stack) won't treat
  // the characteristic as notifiable even though PROPERTY_NOTIFY is set.
  bleTxChar->addDescriptor(new BLE2902());

  service->start();
  bleServer->getAdvertising()->addServiceUUID(BLE_SERVICE_UUID);
  bleServer->getAdvertising()->start();
}

void blePoll() {
  // Bluedroid delivers RX writes via SorterRxCallbacks::onWrite() on its own
  // task, not from loop() - nothing to pump here. Kept as a no-op for
  // symmetry with the ArduinoBLE backend's BLE.poll()-driven event model, so
  // main.ino's loop() doesn't need to know which backend is active.
}

bool bleIsConnected() { return bleConnected; }

void bleSendLine(const char* s) {
  if (!bleConnected || bleTxChar == nullptr) return;
  size_t len = strlen(s);
  // Chunk the line across multiple notify() calls, then send a trailing
  // "\n" chunk so the client's byte-stream line-splitter (the same logic
  // it already uses for Serial's byte stream) sees identical framing over
  // BLE as over USB, regardless of chunk boundaries.
  for (size_t offset = 0; offset < len; offset += BLE_CHUNK_SIZE) {
    size_t chunkLen = len - offset < BLE_CHUNK_SIZE ? len - offset : BLE_CHUNK_SIZE;
    bleTxChar->setValue((uint8_t*)(s + offset), chunkLen);
    bleTxChar->notify();
    delay(10);  // let the stack drain the notify queue - verify on hardware
                // whether this can be shortened/removed
  }
  bleTxChar->setValue((uint8_t*)"\n", 1);
  bleTxChar->notify();
}
#endif  // BLE_BACKEND_ESP32
