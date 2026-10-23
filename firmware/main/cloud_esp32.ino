// Wi-Fi remote link for ESP32 builds: joins the user's Wi-Fi network and
// holds a WebSocket to the app's server, which relays commands from a browser
// anywhere (see PROTOCOL.md's Wi-Fi transport section). It carries the exact
// same line-delimited JSON protocol as Serial and BLE: received lines go
// through feedByte()/handleCommand() like any other transport, so busy
// handling, seq tagging and per-transport replies all behave identically.
//
// All networking (Wi-Fi association, TLS handshakes, socket reads) runs in
// its own FreeRTOS task on the core the Arduino loop doesn't use. A TLS
// handshake can block for a second or more, and doing that inside waitMs()
// mid-route would stretch servo timings and could starve the loop watchdog.
// The two sides only share a byte ring (network -> loop, like ble_esp32.ino's
// RX ring), a line queue (loop -> network) and a few state fields.
#if WIFI_SUPPORTED
#include <NetworkClient.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <WiFi.h>
#include "esp_random.h"
#include "mbedtls/base64.h"

// The core's prebuilt mbedTLS embeds ESP-IDF's default root CA bundle (the
// same set browsers trust), so wss:// works against any public host without
// pinning a certificate that would break on the server's next renewal.
extern const uint8_t x509_crt_bundle_start[] asm("_binary_x509_crt_bundle_start");
extern const uint8_t x509_crt_bundle_end[] asm("_binary_x509_crt_bundle_end");

#define CLOUD_SSID_MAX 32
#define CLOUD_PASSWORD_MAX 64
#define CLOUD_PASSWORD_MIN 8
// Keeps a setCloud line (seq + url + token) under MAX_CMD_LEN.
#define CLOUD_URL_MAX 150
#define CLOUD_TOKEN_MIN 16
#define CLOUD_TOKEN_MAX 80
#define CLOUD_HOST_MAX 96
#define CLOUD_PATH_MAX 128

#define CLOUD_TASK_STACK 12288
#define CLOUD_RX_RING_SIZE 1024
#define CLOUD_TX_QUEUE_DEPTH 16
#define CLOUD_MAX_FRAME 1024

#define CLOUD_CONNECT_TIMEOUT_MS 10000
#define CLOUD_HANDSHAKE_TIMEOUT_MS 10000
#define CLOUD_FRAME_READ_TIMEOUT_MS 2000
// The server pings every 20s, so this much silence means the link is dead
// even if the TCP socket hasn't noticed yet.
#define CLOUD_IDLE_TIMEOUT_MS 60000
#define CLOUD_RETRY_MIN_MS 1000
#define CLOUD_RETRY_MAX_MS 30000
// A rejected token stays rejected until the app sends a new one, so there's
// no point hammering the server with it.
#define CLOUD_REJECTED_RETRY_MS 300000
#define WIFI_REJOIN_MS 30000
#define WIFI_INFO_REFRESH_MS 5000

#define WIFI_LINK_UNCONFIGURED 0
#define WIFI_LINK_CONNECTING 1
#define WIFI_LINK_CONNECTED 2
#define WIFI_LINK_PAUSED 3
#define CLOUD_START_DELAY_MS 2000
#define CLOUD_WIFI_TX_POWER WIFI_POWER_15dBm
#define CLOUD_BROWNOUT_SAFE_BOOTS 2
#define CLOUD_STABLE_UPTIME_MS 60000
#define CLOUD_BROWNOUT_MAGIC 0x4D564254

#define CLOUD_LINK_UNCONFIGURED 0
#define CLOUD_LINK_OFFLINE 1
#define CLOUD_LINK_CONNECTING 2
#define CLOUD_LINK_CONNECTED 3
#define CLOUD_LINK_REJECTED 4

#define WS_OP_CONTINUATION 0x0
#define WS_OP_TEXT 0x1
#define WS_OP_BINARY 0x2
#define WS_OP_CLOSE 0x8
#define WS_OP_PING 0x9
#define WS_OP_PONG 0xA

struct CloudSettings {
  char ssid[CLOUD_SSID_MAX + 1];
  char password[CLOUD_PASSWORD_MAX + 1];
  char url[CLOUD_URL_MAX + 1];
  char token[CLOUD_TOKEN_MAX + 1];
};
uint8_t cloudConnect(const CloudSettings& s);
void cloudApplyWifi(const CloudSettings& s);
void publishCloudSettings(const CloudSettings& next);
void storeCloudSettings(const CloudSettings& next);
CloudSettings currentCloudSettings();

struct CloudUrl {
  bool secure;
  uint16_t port;
  char host[CLOUD_HOST_MAX + 1];
  char path[CLOUD_PATH_MAX + 1];
};
bool parseCloudUrl(const char* url, CloudUrl& out);

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

volatile uint8_t wifiLinkState = WIFI_LINK_UNCONFIGURED;

RTC_NOINIT_ATTR uint32_t cloudBrownoutMagic;
RTC_NOINIT_ATTR uint32_t cloudBrownoutBoots;
volatile bool cloudPausedForPower = false;
volatile uint8_t cloudLinkState = CLOUD_LINK_UNCONFIGURED;
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
uint8_t cloudFrame[CLOUD_MAX_FRAME];
uint8_t cloudTxFrame[8 + MAX_REPLY_LEN + 2];

const char* wifiStateName() {
  switch (wifiLinkState) {
    case WIFI_LINK_CONNECTING: return "connecting";
    case WIFI_LINK_CONNECTED: return "connected";
    case WIFI_LINK_PAUSED: return "paused";
    default: return "unconfigured";
  }
}

const char* cloudStateName() {
  switch (cloudLinkState) {
    case CLOUD_LINK_OFFLINE: return "offline";
    case CLOUD_LINK_CONNECTING: return "connecting";
    case CLOUD_LINK_CONNECTED: return "connected";
    case CLOUD_LINK_REJECTED: return "rejected";
    default: return "unconfigured";
  }
}

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

// Splits ws[s]://host[:port][/path] into its parts. Returns false for
// anything else, so a malformed setCloud is refused up front instead of
// failing silently on every reconnect.
bool parseCloudUrl(const char* url, CloudUrl& out) {
  const char* rest;
  if (strncmp(url, "wss://", 6) == 0) {
    out.secure = true;
    out.port = 443;
    rest = url + 6;
  } else if (strncmp(url, "ws://", 5) == 0) {
    out.secure = false;
    out.port = 80;
    rest = url + 5;
  } else {
    return false;
  }
  const char* hostEnd = rest;
  while (*hostEnd && *hostEnd != ':' && *hostEnd != '/') hostEnd++;
  size_t hostLen = hostEnd - rest;
  if (hostLen == 0 || hostLen > CLOUD_HOST_MAX) return false;
  memcpy(out.host, rest, hostLen);
  out.host[hostLen] = '\0';
  const char* pathStart = hostEnd;
  if (*hostEnd == ':') {
    long parsed = strtol(hostEnd + 1, (char**)&pathStart, 10);
    if (parsed < 1 || parsed > 65535) return false;
    out.port = (uint16_t)parsed;
  }
  if (*pathStart == '\0') {
    strcpy(out.path, "/");
  } else if (*pathStart == '/' && strlen(pathStart) <= CLOUD_PATH_MAX) {
    strcpy(out.path, pathStart);
  } else {
    return false;
  }
  return true;
}

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
  cloudTrackBrownouts();
  // Wi-Fi credentials live in this sketch's own NVS namespace, not the
  // core's, so clearWifi forgets them completely.
  WiFi.persistent(false);
  xTaskCreatePinnedToCore(cloudTask, "cloud", CLOUD_TASK_STACK, nullptr, 1,
                          nullptr, (ARDUINO_RUNNING_CORE + 1) % portNUM_PROCESSORS);
}

// ---- WebSocket client (RFC 6455, client side only) ----
// Small enough to own outright instead of pulling in a library: text frames
// out (masked, as clients must), text/ping/close frames in.

bool cloudReadExact(uint8_t* buf, size_t len) {
  unsigned long start = millis();
  size_t got = 0;
  while (got < len) {
    if (!cloudClient->connected()) return false;
    int n = cloudClient->read(buf + got, len - got);
    if (n > 0) {
      got += n;
      continue;
    }
    if (millis() - start > CLOUD_FRAME_READ_TIMEOUT_MS) return false;
    vTaskDelay(1);
  }
  return true;
}

int cloudReadLine(char* buf, size_t len, unsigned long deadline) {
  size_t n = 0;
  while ((long)(deadline - millis()) > 0) {
    if (!cloudClient->connected() && !cloudClient->available()) return -1;
    int c = cloudClient->read();
    if (c < 0) {
      vTaskDelay(1);
      continue;
    }
    if (c == '\n') {
      if (n > 0 && buf[n - 1] == '\r') n--;
      buf[n] = '\0';
      return n;
    }
    if (n < len - 1) buf[n++] = (char)c;
  }
  return -1;
}

bool cloudSendFrame(uint8_t opcode, const uint8_t* data, size_t len) {
  if (len > MAX_REPLY_LEN + 2) return false;
  size_t h = 0;
  cloudTxFrame[h++] = 0x80 | opcode;
  if (len < 126) {
    cloudTxFrame[h++] = 0x80 | (uint8_t)len;
  } else {
    cloudTxFrame[h++] = 0x80 | 126;
    cloudTxFrame[h++] = (uint8_t)(len >> 8);
    cloudTxFrame[h++] = (uint8_t)(len & 0xFF);
  }
  uint8_t mask[4];
  esp_fill_random(mask, sizeof(mask));
  memcpy(cloudTxFrame + h, mask, 4);
  h += 4;
  for (size_t i = 0; i < len; i++) cloudTxFrame[h + i] = data[i] ^ mask[i % 4];
  return cloudClient->write(cloudTxFrame, h + len) == h + len;
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
  bool secure = url.secure;
  uint16_t port = url.port;
  const char* host = url.host;

  if (secure) {
    cloudTlsClient.setCACertBundle(x509_crt_bundle_start,
                                   x509_crt_bundle_end - x509_crt_bundle_start);
    cloudTlsClient.setHandshakeTimeout(CLOUD_CONNECT_TIMEOUT_MS / 1000);
    cloudClient = &cloudTlsClient;
  } else {
    cloudClient = &cloudPlainClient;
  }
  if (!cloudClient->connect(host, port, CLOUD_CONNECT_TIMEOUT_MS)) {
    cloudCloseSocket();
    return CLOUD_LINK_OFFLINE;
  }
  cloudClient->setNoDelay(true);

  uint8_t keyRaw[16];
  esp_fill_random(keyRaw, sizeof(keyRaw));
  unsigned char key[32];
  size_t keyLen = 0;
  mbedtls_base64_encode(key, sizeof(key), &keyLen, keyRaw, sizeof(keyRaw));
  key[keyLen] = '\0';

  bool defaultPort = (secure && port == 443) || (!secure && port == 80);
  char hostHeader[CLOUD_HOST_MAX + 8];
  if (defaultPort) {
    snprintf(hostHeader, sizeof(hostHeader), "%s", host);
  } else {
    snprintf(hostHeader, sizeof(hostHeader), "%s:%u", host, port);
  }

  char request[640];
  snprintf(request, sizeof(request),
           "GET %s HTTP/1.1\r\n"
           "Host: %s\r\n"
           "Upgrade: websocket\r\n"
           "Connection: Upgrade\r\n"
           "Sec-WebSocket-Key: %s\r\n"
           "Sec-WebSocket-Version: 13\r\n"
           "Authorization: Bearer %s\r\n"
           "X-Sorter-Id: %s\r\n"
           "X-Sorter-Firmware: %s\r\n"
           "\r\n",
           url.path, hostHeader, (const char*)key, s.token, deviceId, FIRMWARE_VERSION);
  size_t requestLen = strlen(request);
  if (cloudClient->write((const uint8_t*)request, requestLen) != requestLen) {
    cloudCloseSocket();
    return CLOUD_LINK_OFFLINE;
  }

  unsigned long deadline = millis() + CLOUD_HANDSHAKE_TIMEOUT_MS;
  char line[160];
  if (cloudReadLine(line, sizeof(line), deadline) < 12 ||
      strncmp(line, "HTTP/1.1 ", 9) != 0) {
    cloudCloseSocket();
    return CLOUD_LINK_OFFLINE;
  }
  int status = atoi(line + 9);
  while (true) {
    int n = cloudReadLine(line, sizeof(line), deadline);
    if (n < 0) {
      cloudCloseSocket();
      return CLOUD_LINK_OFFLINE;
    }
    if (n == 0) break;
  }
  if (status != 101) {
    cloudCloseSocket();
    return status == 401 || status == 403 || status == 404 ? CLOUD_LINK_REJECTED
                                                           : CLOUD_LINK_OFFLINE;
  }

  cloudSocketOpen = true;
  cloudLastRxAt = millis();
  xQueueReset(cloudTxQueue);
  cloudRx.clear();
  return CLOUD_LINK_CONNECTED;
}

// Reads every complete frame waiting on the socket. Returns false once the
// link is gone (closed by either side, a protocol error, or idle timeout).
bool cloudServiceSocket() {
  if (!cloudClient->connected()) return false;
  while (cloudClient->available() >= 2) {
    uint8_t header[2];
    if (!cloudReadExact(header, 2)) return false;
    uint8_t opcode = header[0] & 0x0F;
    bool masked = header[1] & 0x80;
    size_t len = header[1] & 0x7F;
    if (len == 126) {
      uint8_t ext[2];
      if (!cloudReadExact(ext, 2)) return false;
      len = ((size_t)ext[0] << 8) | ext[1];
    } else if (len == 127) {
      return false;
    }
    if (len > CLOUD_MAX_FRAME) return false;
    uint8_t mask[4] = {0, 0, 0, 0};
    if (masked && !cloudReadExact(mask, 4)) return false;
    if (len > 0 && !cloudReadExact(cloudFrame, len)) return false;
    if (masked) {
      for (size_t i = 0; i < len; i++) cloudFrame[i] ^= mask[i % 4];
    }
    cloudLastRxAt = millis();

    switch (opcode) {
      case WS_OP_TEXT:
      case WS_OP_BINARY:
      case WS_OP_CONTINUATION:
        cloudRx.push(cloudFrame, len);
        break;
      case WS_OP_PING:
        if (len <= 125) cloudSendFrame(WS_OP_PONG, cloudFrame, len);
        break;
      case WS_OP_CLOSE:
        cloudSendFrame(WS_OP_CLOSE, cloudFrame, len < 2 ? len : 2);
        return false;
      default:
        break;
    }
  }
  if (millis() - cloudLastRxAt > CLOUD_IDLE_TIMEOUT_MS) return false;

  CloudTxLine out;
  while (xQueueReceive(cloudTxQueue, &out, 0) == pdTRUE) {
    if (!cloudSendFrame(WS_OP_TEXT, (const uint8_t*)out.data, out.len)) return false;
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

void cloudTrackBrownouts() {
  if (cloudBrownoutMagic != CLOUD_BROWNOUT_MAGIC) {
    cloudBrownoutMagic = CLOUD_BROWNOUT_MAGIC;
    cloudBrownoutBoots = 0;
  }
  if (esp_reset_reason() == ESP_RST_BROWNOUT) {
    cloudBrownoutBoots++;
  } else {
    cloudBrownoutBoots = 0;
  }
  cloudPausedForPower = cloudBrownoutBoots >= CLOUD_BROWNOUT_SAFE_BOOTS &&
                        cloudSettings.ssid[0] != '\0';
}

void cloudWaitWhilePaused() {
  if (!cloudPausedForPower) return;
  uint32_t pausedVersion = cloudSettingsVersion;
  wifiLinkState = WIFI_LINK_PAUSED;
  cloudLinkState =
      currentCloudSettings().url[0] ? CLOUD_LINK_OFFLINE : CLOUD_LINK_UNCONFIGURED;
  while (cloudSettingsVersion == pausedVersion) vTaskDelay(pdMS_TO_TICKS(250));
  cloudPausedForPower = false;
  cloudBrownoutBoots = 0;
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
    if (cloudBrownoutBoots != 0 && millis() > CLOUD_STABLE_UPTIME_MS) {
      cloudBrownoutBoots = 0;
    }
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

// ---- Commands ----

void publishCloudSettings(const CloudSettings& next) {
  portENTER_CRITICAL(&cloudMux);
  cloudSettings = next;
  cloudSettingsVersion++;
  portEXIT_CRITICAL(&cloudMux);
}

void storeCloudSettings(const CloudSettings& next) {
  cloudPrefs.putString("ssid", next.ssid);
  cloudPrefs.putString("pass", next.password);
  cloudPrefs.putString("url", next.url);
  cloudPrefs.putString("token", next.token);
  publishCloudSettings(next);
}

CloudSettings currentCloudSettings() {
  portENTER_CRITICAL(&cloudMux);
  CloudSettings copy = cloudSettings;
  portEXIT_CRITICAL(&cloudMux);
  return copy;
}

void printWifiStatus(Print& reply) {
  CloudSettings s = currentCloudSettings();
  char ip[16];
  int rssi;
  portENTER_CRITICAL(&cloudMux);
  strcpy(ip, wifiIp);
  rssi = wifiRssi;
  portEXIT_CRITICAL(&cloudMux);

  reply.print(F("{\"status\":\"ok\",\"wifi\":\""));
  reply.print(wifiStateName());
  reply.write('"');
  if (s.ssid[0]) {
    reply.print(F(",\"ssid\":\""));
    printJsonEscaped(s.ssid, reply);
    reply.write('"');
  }
  if (wifiLinkState == WIFI_LINK_CONNECTED) {
    reply.print(F(",\"ip\":\""));
    reply.print(ip);
    reply.print(F("\",\"rssi\":"));
    reply.print(rssi);
  }
  reply.print(F(",\"cloud\":\""));
  reply.print(cloudStateName());
  reply.write('"');
  CloudUrl url;
  if (s.url[0] && parseCloudUrl(s.url, url)) {
    reply.print(F(",\"host\":\""));
    printJsonEscaped(url.host, reply);
    reply.write('"');
  }
  reply.println(F("}"));
}

// {"setWifi": {...}}, {"setCloud": {...}}, {"clearWifi": true} and
// {"getWifi": true} - see PROTOCOL.md. Returns false for any other command so
// runCommand() keeps looking.
bool handleCloudCommand(JsonDocument& doc, Print& reply) {
  if (!doc["setWifi"].isNull()) {
    JsonObjectConst cfg = doc["setWifi"];
    const char* ssid = cfg["ssid"] | "";
    const char* password = cfg["password"] | "";
    size_t ssidLen = strlen(ssid);
    size_t passwordLen = strlen(password);
    if (ssidLen < 1 || ssidLen > CLOUD_SSID_MAX) {
      reply.println(F("{\"error\":\"ssid must be 1 to 32 bytes\"}"));
      return true;
    }
    if (passwordLen != 0 &&
        (passwordLen < CLOUD_PASSWORD_MIN || passwordLen > CLOUD_PASSWORD_MAX)) {
      reply.println(F("{\"error\":\"password must be empty or 8 to 64 characters\"}"));
      return true;
    }
    CloudSettings next = currentCloudSettings();
    strcpy(next.ssid, ssid);
    strcpy(next.password, password);
    storeCloudSettings(next);
    reply.println(F("{\"status\":\"ok\"}"));
    return true;
  }

  if (!doc["setCloud"].isNull()) {
    JsonObjectConst cfg = doc["setCloud"];
    const char* url = cfg["url"] | "";
    const char* token = cfg["token"] | "";
    CloudUrl parsed;
    if (strlen(url) > CLOUD_URL_MAX || !parseCloudUrl(url, parsed)) {
      reply.println(F("{\"error\":\"url must be a ws:// or wss:// address up to 150 characters\"}"));
      return true;
    }
    size_t tokenLen = strlen(token);
    if (tokenLen < CLOUD_TOKEN_MIN || tokenLen > CLOUD_TOKEN_MAX) {
      reply.println(F("{\"error\":\"token must be 16 to 80 characters\"}"));
      return true;
    }
    CloudSettings next = currentCloudSettings();
    strcpy(next.url, url);
    strcpy(next.token, token);
    storeCloudSettings(next);
    reply.println(F("{\"status\":\"ok\"}"));
    return true;
  }

  if (isTrue(doc["clearWifi"])) {
    CloudSettings next;
    memset(&next, 0, sizeof(next));
    cloudPrefs.clear();
    publishCloudSettings(next);
    reply.println(F("{\"status\":\"ok\"}"));
    return true;
  }

  if (isTrue(doc["getWifi"])) {
    printWifiStatus(reply);
    return true;
  }

  return false;
}
#endif  // WIFI_SUPPORTED
