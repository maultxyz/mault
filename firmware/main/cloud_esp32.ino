// Wi-Fi backend for ESP32 builds (see cloud_common.ino for the shared link
// logic and PROTOCOL.md's Wi-Fi transport section).
//
// All networking (Wi-Fi association, TLS handshakes, socket reads) runs in
// its own FreeRTOS task on the core the Arduino loop doesn't use. A TLS
// handshake can block for a second or more, and doing that inside waitMs()
// mid-route would stretch servo timings and could starve the loop watchdog.
// The two sides only share a byte ring (network -> loop, like ble_esp32.ino's
// RX ring), a line queue (loop -> network) and a few state fields.
#if WIFI_BACKEND_ESP32
#include <NetworkClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <WiFi.h>
#include "esp_random.h"

// The core's prebuilt mbedTLS embeds ESP-IDF's default root CA bundle (the
// same set browsers trust), so wss:// works against any public host without
// pinning a certificate that would break on the server's next renewal.
extern const uint8_t x509_crt_bundle_start[] asm("_binary_x509_crt_bundle_start");
extern const uint8_t x509_crt_bundle_end[] asm("_binary_x509_crt_bundle_end");

#define CLOUD_CONNECT_TIMEOUT_MS 10000
#define CLOUD_TASK_STACK 12288
#define CLOUD_RX_RING_SIZE 1024
#define CLOUD_TX_QUEUE_DEPTH 16

#define CLOUD_START_DELAY_MS 2000
#define CLOUD_WIFI_TX_POWER WIFI_POWER_15dBm

uint8_t cloudConnect(const CloudSettings& s);
void cloudApplyWifi(const CloudSettings& s);
void publishCloudSettings(const CloudSettings& next);

struct CloudTxLine {
  uint16_t len;
  char data[MAX_REPLY_LEN + 2];
};

// Written by the loop task (commands), read by the network task, always
// under cloudMux. cloudSettingsVersion tells the network task to reapply.
CloudSettings cloudSettings;
volatile uint32_t cloudSettingsVersion = 0;
portMUX_TYPE cloudMux = portMUX_INITIALIZER_UNLOCKED;
Preferences cloudPrefs;

volatile bool cloudPausedForPower = false;
char wifiIp[16] = "";
int wifiRssi = 0;

ByteRing<CLOUD_RX_RING_SIZE> cloudRx;

QueueHandle_t cloudTxQueue = nullptr;

// Network-task-only state.
NetworkClient cloudPlainClient;
NetworkClientSecure cloudTlsClient;
NetworkClient* cloudClient = nullptr;
bool cloudSocketOpen = false;
unsigned long cloudLastRxAt = 0;

void cloudIdle() { vTaskDelay(1); }

void cloudFillRandom(uint8_t* buf, size_t len) { esp_fill_random(buf, len); }

// Both radios run side by side on an ESP32, so BLE stays up regardless.
bool cloudOwnsRadio() { return false; }

bool cloudIsConnected() {
  return cloudTxQueue != nullptr && cloudLinkState == CLOUD_LINK_CONNECTED;
}

void cloudSendLine(const char* s) {
  if (!cloudIsConnected()) return;
  CloudTxLine line;
  line.len = copyLine(line.data, s);
  xQueueSend(cloudTxQueue, &line, 0);
}

void cloudPoll() { cloudRx.drainTo(cloudInput, cloudReply); }

void loadCloudSettings() {
  CloudSettings loaded;
  memset(&loaded, 0, sizeof(loaded));
  cloudPrefs.getString("ssid", loaded.ssid, sizeof(loaded.ssid));
  cloudPrefs.getString("pass", loaded.password, sizeof(loaded.password));
  cloudPrefs.getString("url", loaded.url, sizeof(loaded.url));
  cloudPrefs.getString("token", loaded.token, sizeof(loaded.token));
  publishCloudSettings(loaded);
}

void cloudTask(void*);

void cloudInit() {
  cloudTxQueue = xQueueCreate(CLOUD_TX_QUEUE_DEPTH, sizeof(CloudTxLine));
  cloudPrefs.begin("cloud", false);
  loadCloudSettings();
  cloudPauseAfterBrownouts();
  // Wi-Fi credentials live in this sketch's own NVS namespace, not the
  // core's, so clearWifi forgets them completely.
  WiFi.persistent(false);
  xTaskCreatePinnedToCore(cloudTask, "cloud", CLOUD_TASK_STACK, nullptr, 1,
                          nullptr, (ARDUINO_RUNNING_CORE + 1) % portNUM_PROCESSORS);
}

void cloudCloseSocket() {
  if (cloudClient) cloudClient->stop();
  cloudSocketOpen = false;
}

// Returns CLOUD_LINK_CONNECTED, CLOUD_LINK_REJECTED (the server refused the
// token) or CLOUD_LINK_OFFLINE (anything network-shaped, worth retrying).
uint8_t cloudConnect(const CloudSettings& s) {
  CloudUrl url;
  if (!parseCloudUrl(s.url, url)) return CLOUD_LINK_REJECTED;

  if (url.secure) {
    cloudTlsClient.setCACertBundle(x509_crt_bundle_start,
                                   x509_crt_bundle_end - x509_crt_bundle_start);
    cloudTlsClient.setHandshakeTimeout(CLOUD_CONNECT_TIMEOUT_MS / 1000);
    cloudClient = &cloudTlsClient;
  } else {
    cloudClient = &cloudPlainClient;
  }
  if (!cloudClient->connect(url.host, url.port, CLOUD_CONNECT_TIMEOUT_MS)) {
    cloudCloseSocket();
    return CLOUD_LINK_OFFLINE;
  }
  cloudClient->setNoDelay(true);

  uint8_t result = wsHandshake(*cloudClient, url, s.token);
  if (result != CLOUD_LINK_CONNECTED) {
    cloudCloseSocket();
    return result;
  }

  cloudSocketOpen = true;
  cloudLastRxAt = millis();
  xQueueReset(cloudTxQueue);
  cloudRx.clear();
  return CLOUD_LINK_CONNECTED;
}

void cloudPushRx(const uint8_t* data, size_t len) { cloudRx.push(data, len); }

// Reads every complete frame waiting on the socket and sends queued replies.
// Returns false once the link is gone.
bool cloudServiceSocket() {
  if (!wsReadFrames(*cloudClient, cloudLastRxAt, cloudPushRx)) return false;

  CloudTxLine out;
  while (xQueueReceive(cloudTxQueue, &out, 0) == pdTRUE) {
    if (!wsSendFrame(*cloudClient, WS_OP_TEXT, (const uint8_t*)out.data, out.len)) {
      return false;
    }
  }
  return true;
}

void cloudApplyWifi(const CloudSettings& s) {
  cloudCloseSocket();
  if (s.ssid[0] == '\0') {
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    return;
  }
  char hostname[24];
  snprintf(hostname, sizeof(hostname), "mault-sorter-%s", deviceId);
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(CLOUD_WIFI_TX_POWER);
  WiFi.setHostname(hostname);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect();
  WiFi.begin(s.ssid, s.password[0] ? s.password : nullptr);
}

void cloudPauseAfterBrownouts() {
  cloudPausedForPower =
      bootingAfterRepeatedBrownouts() && cloudSettings.ssid[0] != '\0';
}

void cloudWaitWhilePaused() {
  if (!cloudPausedForPower) return;
  uint32_t pausedVersion = cloudSettingsVersion;
  wifiLinkState = WIFI_LINK_PAUSED;
  cloudLinkState =
      currentCloudSettings().url[0] ? CLOUD_LINK_OFFLINE : CLOUD_LINK_UNCONFIGURED;
  while (cloudSettingsVersion == pausedVersion) vTaskDelay(pdMS_TO_TICKS(250));
  cloudPausedForPower = false;
  consecutiveBrownoutBoots = 0;
}

void cloudTask(void*) {
  vTaskDelay(pdMS_TO_TICKS(CLOUD_START_DELAY_MS));
  cloudWaitWhilePaused();

  CloudSettings local;
  memset(&local, 0, sizeof(local));
  uint32_t appliedVersion = 0;
  unsigned long wifiBeganAt = 0;
  unsigned long nextAttemptAt = 0;
  unsigned long wifiInfoAt = 0;
  unsigned long retryDelay = CLOUD_RETRY_MIN_MS;

  for (;;) {
    if (appliedVersion != cloudSettingsVersion) {
      portENTER_CRITICAL(&cloudMux);
      local = cloudSettings;
      appliedVersion = cloudSettingsVersion;
      portEXIT_CRITICAL(&cloudMux);
      cloudLinkState = CLOUD_LINK_UNCONFIGURED;
      cloudApplyWifi(local);
      wifiBeganAt = millis();
      nextAttemptAt = millis();
      retryDelay = CLOUD_RETRY_MIN_MS;
    }

    bool hasLink = local.url[0] != '\0' && local.token[0] != '\0';
    if (local.ssid[0] == '\0') {
      wifiLinkState = WIFI_LINK_UNCONFIGURED;
      cloudLinkState = CLOUD_LINK_UNCONFIGURED;
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }

    if (WiFi.status() != WL_CONNECTED) {
      if (cloudSocketOpen) cloudCloseSocket();
      wifiLinkState = WIFI_LINK_CONNECTING;
      if (cloudLinkState != CLOUD_LINK_REJECTED) {
        cloudLinkState = hasLink ? CLOUD_LINK_OFFLINE : CLOUD_LINK_UNCONFIGURED;
      }
      portENTER_CRITICAL(&cloudMux);
      wifiIp[0] = '\0';
      portEXIT_CRITICAL(&cloudMux);
      // Auto-reconnect covers a dropped connection, but not a network that
      // was out of range when it gave up, so rejoin from scratch now and then.
      if (millis() - wifiBeganAt > WIFI_REJOIN_MS) {
        WiFi.disconnect();
        WiFi.begin(local.ssid, local.password[0] ? local.password : nullptr);
        wifiBeganAt = millis();
      }
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }

    wifiLinkState = WIFI_LINK_CONNECTED;
    if (wifiIp[0] == '\0' || millis() - wifiInfoAt > WIFI_INFO_REFRESH_MS) {
      char ip[16];
      WiFi.localIP().toString().toCharArray(ip, sizeof(ip));
      int rssi = WiFi.RSSI();
      portENTER_CRITICAL(&cloudMux);
      strcpy(wifiIp, ip);
      wifiRssi = rssi;
      portEXIT_CRITICAL(&cloudMux);
      wifiInfoAt = millis();
    }

    if (!hasLink) {
      cloudLinkState = CLOUD_LINK_UNCONFIGURED;
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }

    if (!cloudSocketOpen) {
      if ((long)(millis() - nextAttemptAt) < 0) {
        vTaskDelay(pdMS_TO_TICKS(100));
        continue;
      }
      if (cloudLinkState != CLOUD_LINK_REJECTED) cloudLinkState = CLOUD_LINK_CONNECTING;
      uint8_t result = cloudConnect(local);
      if (appliedVersion != cloudSettingsVersion) {
        cloudCloseSocket();
        continue;
      }
      cloudLinkState = result;
      if (result == CLOUD_LINK_CONNECTED) {
        retryDelay = CLOUD_RETRY_MIN_MS;
      } else if (result == CLOUD_LINK_REJECTED) {
        nextAttemptAt = millis() + CLOUD_REJECTED_RETRY_MS;
      } else {
        nextAttemptAt = millis() + retryDelay;
        retryDelay = min(retryDelay * 2, (unsigned long)CLOUD_RETRY_MAX_MS);
      }
      continue;
    }

    if (!cloudServiceSocket()) {
      cloudCloseSocket();
      cloudLinkState = CLOUD_LINK_OFFLINE;
      nextAttemptAt = millis() + CLOUD_RETRY_MIN_MS;
      continue;
    }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ---- Settings ----

void publishCloudSettings(const CloudSettings& next) {
  portENTER_CRITICAL(&cloudMux);
  cloudSettings = next;
  cloudSettingsVersion++;
  portEXIT_CRITICAL(&cloudMux);
}

bool cloudSaveSettings(const CloudSettings& next) {
  cloudPrefs.putString("ssid", next.ssid);
  cloudPrefs.putString("pass", next.password);
  cloudPrefs.putString("url", next.url);
  cloudPrefs.putString("token", next.token);
  publishCloudSettings(next);
  return false;
}

bool cloudForgetSettings() {
  CloudSettings next;
  memset(&next, 0, sizeof(next));
  cloudPrefs.clear();
  publishCloudSettings(next);
  return false;
}

CloudSettings currentCloudSettings() {
  portENTER_CRITICAL(&cloudMux);
  CloudSettings copy = cloudSettings;
  portEXIT_CRITICAL(&cloudMux);
  return copy;
}

void cloudNetInfo(char* ip, int& rssi) {
  portENTER_CRITICAL(&cloudMux);
  strcpy(ip, wifiIp);
  rssi = wifiRssi;
  portEXIT_CRITICAL(&cloudMux);
}
#endif  // WIFI_BACKEND_ESP32
