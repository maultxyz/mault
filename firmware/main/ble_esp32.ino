// BLE backend for ESP32-S3, using the BLE library bundled with the
// esp32:esp32 Arduino core (NimBLE on S3 since core 3.3, Bluedroid before) (BLEDevice/BLEServer/BLECharacteristic - already
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
#if defined(CONFIG_NIMBLE_ENABLED)
#include "services/gap/ble_svc_gap.h"
#elif defined(CONFIG_BLUEDROID_ENABLED)
#include <esp_gap_ble_api.h>
#endif

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

#define BLE_PREFERRED_MTU 517
#define BLE_DEFAULT_MTU 23
#define BLE_ATT_HEADER_SIZE 3
#define BLE_CHUNK_GAP_MS 5
#define BLE_CONN_INTERVAL_MIN 6
#define BLE_CONN_INTERVAL_MAX 24
#define BLE_CONN_SUPERVISION_TIMEOUT 400
#define BLE_RX_RING_SIZE 512
#define BLE_ADV_FLAGS_GENERAL_DISCOVERABLE 0x06

ByteRing<BLE_RX_RING_SIZE> bleRx;

BLEServer* bleServer = nullptr;
BLECharacteristic* bleTxChar = nullptr;
volatile bool bleConnected = false;
// Set when setName lands while a central is connected: advertising only
// picks the new name up once it disconnects (see bleUpdateName()).
volatile bool bleNamePending = false;
char bleAdvertisedName[SORTER_NAME_MAX_BYTES + 1] = "";

// The advertisement carries the flags and the NUS service (21 of 31 bytes)
// and the scan response only the complete name, so a 29-byte name always
// fits. Built by hand because the library default moves the name between the
// two packets by length and never rebuilds it after a rename.
void bleApplyAdvertisingName() {
#if defined(CONFIG_NIMBLE_ENABLED)
  ble_svc_gap_device_name_set(bleAdvertisedName);
#elif defined(CONFIG_BLUEDROID_ENABLED)
  esp_ble_gap_set_device_name(bleAdvertisedName);
#endif
  BLEAdvertisementData advertisement;
  advertisement.setFlags(BLE_ADV_FLAGS_GENERAL_DISCOVERABLE);
  advertisement.setCompleteServices(BLEUUID(BLE_SERVICE_UUID));
  BLEAdvertisementData scanResponse;
  scanResponse.setName(bleAdvertisedName);
  BLEAdvertising* advertising = bleServer->getAdvertising();
  advertising->setAdvertisementData(advertisement);
  advertising->setScanResponseData(scanResponse);
}

class SorterServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override { bleConnected = true; }
#if defined(CONFIG_NIMBLE_ENABLED)
  void onConnect(BLEServer* server, ble_gap_conn_desc* desc) override {
    server->requestConnParams(desc->conn_handle, BLE_CONN_INTERVAL_MIN, BLE_CONN_INTERVAL_MAX, 0,
                              BLE_CONN_SUPERVISION_TIMEOUT);
  }
#elif defined(CONFIG_BLUEDROID_ENABLED)
  void onConnect(BLEServer* server, esp_ble_gatts_cb_param_t* param) override {
    server->requestConnParams(param->connect.remote_bda, BLE_CONN_INTERVAL_MIN,
                              BLE_CONN_INTERVAL_MAX, 0, BLE_CONN_SUPERVISION_TIMEOUT);
  }
#endif
  void onDisconnect(BLEServer* server) override {
    bleConnected = false;
    if (bleNamePending) {
      bleNamePending = false;
      bleApplyAdvertisingName();
    }
    // Bluedroid stops advertising once connected and doesn't resume on its
    // own - restart it so a disconnected (or different) central can
    // reconnect without a power cycle.
    server->getAdvertising()->start();
  }
};

class SorterRxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = characteristic->getValue();
    bleRx.push((const uint8_t*)value.c_str(), value.length());
  }
};

void bleInit() {
  // deviceId and the saved sorterName are already loaded by main.ino's
  // setup() (initDeviceIdFromEspMac() and loadSorterName() run before
  // bleInit()), so the default name can include the ID.
  formatAdvertisedName(bleAdvertisedName, sizeof(bleAdvertisedName));

  BLEDevice::init(bleAdvertisedName);
  BLEDevice::setMTU(BLE_PREFERRED_MTU);
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
  bleApplyAdvertisingName();
  bleServer->getAdvertising()->start();
}

// Called after setName stored a new name. A connected central keeps the old
// advertisement until it disconnects: restarting advertising now would let a
// second central connect alongside it.
void bleUpdateName() {
  if (bleServer == nullptr) return;
  formatAdvertisedName(bleAdvertisedName, sizeof(bleAdvertisedName));
  if (bleConnected) {
    bleNamePending = true;
    return;
  }
  BLEAdvertising* advertising = bleServer->getAdvertising();
  advertising->stop();
  bleApplyAdvertisingName();
  advertising->start();
}

void blePoll() { bleRx.drainTo(bleInput, bleReply); }

bool bleIsConnected() { return bleConnected; }

const char* bleState() { return bleConnected ? "connected" : "advertising"; }

uint16_t bleMtu() {
  if (!bleConnected || bleServer == nullptr) return 0;
  return bleServer->getPeerMTU(bleServer->getConnId());
}

void bleSendLine(const char* s) {
  if (!bleConnected || bleTxChar == nullptr) return;
  static char line[MAX_REPLY_LEN + 2];
  size_t len = copyLine(line, s);
  uint16_t mtu = bleMtu();
  size_t chunkSize = (mtu > BLE_DEFAULT_MTU ? mtu : BLE_DEFAULT_MTU) - BLE_ATT_HEADER_SIZE;
  for (size_t offset = 0; offset < len; offset += chunkSize) {
    if (offset > 0) delay(BLE_CHUNK_GAP_MS);
    size_t chunkLen = len - offset < chunkSize ? len - offset : chunkSize;
    bleTxChar->setValue((uint8_t*)(line + offset), chunkLen);
    bleTxChar->notify();
  }
}
#endif  // BLE_BACKEND_ESP32
