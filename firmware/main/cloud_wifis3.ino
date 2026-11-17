// Wi-Fi backend for the Uno R4 WiFi (see cloud_common.ino for the shared
// link logic and PROTOCOL.md's Wi-Fi transport section). The radio is the
// board's ESP32-S3 co-processor, driven over AT commands by the WiFiS3
// library.
//
// ArduinoBLE talks to that same co-processor, and the two can't be relied on
// to run together, so the radio belongs to one of them per boot: a board with
// a saved network joins Wi-Fi and leaves BLE off, any other board advertises
// over BLE. Saving the first network, or forgetting it, restarts the board
// into the other mode (the reply carries "restarting":true first).
//
// There's no second core here, so networking runs from the loop through
// cloudPoll(). Every WiFiS3 call is a blocking AT exchange, so:
//   - the modem timeout stays under the hardware watchdog's period, and the
//     watchdog is fed between exchanges;
//   - while any command runs, only an already-open socket is serviced
//     (cheap reads and writes), never a Wi-Fi join or TLS handshake, which
//     would stretch servo timings mid-route.
#if WIFI_BACKEND_WIFIS3
#include <WiFiS3.h>

#define CLOUD_SETTINGS_EEPROM_ADDR 512
#define CLOUD_SETTINGS_EEPROM_MAGIC 0xC1
#define CLOUD_SETTINGS_EEPROM_LAYOUT 1
#define CLOUD_MODEM_TIMEOUT_MS 3000
#define CLOUD_POLL_OPEN_MS 20
#define CLOUD_POLL_IDLE_MS 250
#define CLOUD_RESTART_DELAY_MS 300
// Like the ESP32 backend, the join waits until the boot-time servo moves are
// done, so the radio's start-up current spikes don't land on top of them.
#define CLOUD_START_DELAY_MS 2000

void cloudBeginWifi(const CloudSettings& s);
uint8_t cloudConnect(const CloudSettings& s);
void writeCloudSettings(const CloudSettings& next);

CloudSettings cloudSettings;
bool cloudSettingsLoaded = false;
// Decided once at boot: whether Wi-Fi (rather than BLE) owns the radio.
bool cloudRadioIsWifi = false;

WiFiClient cloudPlainClient;
WiFiSSLClient cloudTlsClient;
Client* cloudClient = nullptr;
bool cloudSocketOpen = false;
bool cloudSendFailed = false;
unsigned long cloudLastRxAt = 0;
char wifiIp[16] = "";
int wifiRssi = 0;

bool cloudPolling = false;
bool cloudWifiStarted = false;
unsigned long cloudStartAt = 0;
unsigned long cloudLastPollAt = 0;
unsigned long cloudRestartAt = 0;
unsigned long wifiBeganAt = 0;
unsigned long wifiInfoAt = 0;
unsigned long nextAttemptAt = 0;
unsigned long retryDelay = CLOUD_RETRY_MIN_MS;

void cloudIdle() { feedWatchdog(); }

void cloudFillRandom(uint8_t* buf, size_t len) {
  for (size_t i = 0; i < len; i++) buf[i] = (uint8_t)random(256);
}

void loadCloudSettings() {
  if (cloudSettingsLoaded) return;
  cloudSettingsLoaded = true;
  memset(&cloudSettings, 0, sizeof(cloudSettings));
  if (EEPROM.read(CLOUD_SETTINGS_EEPROM_ADDR) != CLOUD_SETTINGS_EEPROM_MAGIC ||
      EEPROM.read(CLOUD_SETTINGS_EEPROM_ADDR + 1) != CLOUD_SETTINGS_EEPROM_LAYOUT) {
    return;
  }
  EEPROM.get(CLOUD_SETTINGS_EEPROM_ADDR + 2, cloudSettings);
  cloudSettings.ssid[CLOUD_SSID_MAX] = '\0';
  cloudSettings.password[CLOUD_PASSWORD_MAX] = '\0';
  cloudSettings.url[CLOUD_URL_MAX] = '\0';
  cloudSettings.token[CLOUD_TOKEN_MAX] = '\0';
}

bool cloudOwnsRadio() {
  loadCloudSettings();
  return cloudSettings.ssid[0] != '\0';
}

void cloudInit() {
  loadCloudSettings();
  cloudRadioIsWifi = cloudSettings.ssid[0] != '\0';
  if (!cloudRadioIsWifi) return;
  randomSeed(micros());
  modem.begin();
  modem.timeout(CLOUD_MODEM_TIMEOUT_MS);
  // Restarting into Wi-Fi mode only resets this MCU, not the co-processor,
  // which may still be running BLE from the previous boot.
  std::string res = "";
  modem.write(std::string(PROMPT(_HCI_END)), res, "%s", CMD(_HCI_END));
  // begin() would otherwise spin until the network is joined; the join is
  // polled from cloudPoll() instead.
  WiFi.setTimeout(0);
  wifiLinkState = WIFI_LINK_CONNECTING;
  cloudStartAt = millis() + CLOUD_START_DELAY_MS;
}

bool cloudIsConnected() {
  return cloudRadioIsWifi && cloudSocketOpen && cloudLinkState == CLOUD_LINK_CONNECTED;
}

void cloudSendLine(const char* s) {
  if (!cloudIsConnected() || cloudSendFailed) return;
  static char line[MAX_REPLY_LEN + 2];
  size_t len = copyLine(line, s);
  feedWatchdog();
  if (!wsSendFrame(*cloudClient, WS_OP_TEXT, (const uint8_t*)line, len)) {
    cloudSendFailed = true;
  }
}

void cloudFeedRx(const uint8_t* data, size_t len) {
  for (size_t i = 0; i < len; i++) feedByte(cloudInput, (char)data[i], cloudReply);
}

void cloudCloseSocket() {
  if (cloudClient) cloudClient->stop();
  cloudSocketOpen = false;
  cloudSendFailed = false;
}

void cloudBeginWifi(const CloudSettings& s) {
  cloudCloseSocket();
  feedWatchdog();
  char hostname[24];
  snprintf(hostname, sizeof(hostname), "mault-sorter-%s", deviceId);
  WiFi.setHostname(hostname);
  feedWatchdog();
  WiFi.begin(s.ssid, s.password[0] ? s.password : nullptr);
  wifiBeganAt = millis();
  nextAttemptAt = millis();
  retryDelay = CLOUD_RETRY_MIN_MS;
  wifiLinkState = WIFI_LINK_CONNECTING;
  cloudLinkState = CLOUD_LINK_UNCONFIGURED;
}

// Returns CLOUD_LINK_CONNECTED, CLOUD_LINK_REJECTED (the server refused the
// token) or CLOUD_LINK_OFFLINE (anything network-shaped, worth retrying).
uint8_t cloudConnect(const CloudSettings& s) {
  CloudUrl url;
  if (!parseCloudUrl(s.url, url)) return CLOUD_LINK_REJECTED;
  // A null CA lets the co-processor verify against its built-in root bundle.
  cloudClient = url.secure ? (Client*)&cloudTlsClient : (Client*)&cloudPlainClient;
  feedWatchdog();
  if (!cloudClient->connect(url.host, url.port)) {
    cloudCloseSocket();
    return CLOUD_LINK_OFFLINE;
  }
  uint8_t result = wsHandshake(*cloudClient, url, s.token);
  if (result != CLOUD_LINK_CONNECTED) {
    cloudCloseSocket();
    return result;
  }
  cloudSocketOpen = true;
  cloudSendFailed = false;
  cloudLastRxAt = millis();
  return CLOUD_LINK_CONNECTED;
}

void cloudDropSocket() {
  cloudCloseSocket();
  cloudLinkState = CLOUD_LINK_OFFLINE;
  nextAttemptAt = millis() + CLOUD_RETRY_MIN_MS;
}

void cloudStep() {
  if (cloudSocketOpen) {
    feedWatchdog();
    bool alive = !cloudSendFailed && wsReadFrames(*cloudClient, cloudLastRxAt, cloudFeedRx);
    // A command run from cloudFeedRx() may have failed to send its reply.
    if (!alive || cloudSendFailed) cloudDropSocket();
    return;
  }
  if (commandInProgress) return;

  if (!cloudWifiStarted) {
    if ((long)(millis() - cloudStartAt) < 0) return;
    cloudWifiStarted = true;
    cloudBeginWifi(cloudSettings);
    return;
  }

  bool hasLink = cloudSettings.url[0] != '\0' && cloudSettings.token[0] != '\0';
  feedWatchdog();
  if (WiFi.status() != WL_CONNECTED) {
    wifiLinkState = WIFI_LINK_CONNECTING;
    if (cloudLinkState != CLOUD_LINK_REJECTED) {
      cloudLinkState = hasLink ? CLOUD_LINK_OFFLINE : CLOUD_LINK_UNCONFIGURED;
    }
    wifiIp[0] = '\0';
    // Rejoin from scratch now and then, so a network that was out of range
    // when the last attempt gave up gets picked up once it's back.
    if (millis() - wifiBeganAt > WIFI_REJOIN_MS) {
      feedWatchdog();
      WiFi.disconnect();
      cloudBeginWifi(cloudSettings);
    }
    return;
  }

  wifiLinkState = WIFI_LINK_CONNECTED;
  if (wifiIp[0] == '\0' || millis() - wifiInfoAt > WIFI_INFO_REFRESH_MS) {
    feedWatchdog();
    WiFi.localIP().toString().toCharArray(wifiIp, sizeof(wifiIp));
    feedWatchdog();
    wifiRssi = WiFi.RSSI();
    wifiInfoAt = millis();
  }

  if (!hasLink) {
    cloudLinkState = CLOUD_LINK_UNCONFIGURED;
    return;
  }
  if ((long)(millis() - nextAttemptAt) < 0) return;

  if (cloudLinkState != CLOUD_LINK_REJECTED) cloudLinkState = CLOUD_LINK_CONNECTING;
  uint8_t result = cloudConnect(cloudSettings);
  cloudLinkState = result;
  if (result == CLOUD_LINK_CONNECTED) {
    retryDelay = CLOUD_RETRY_MIN_MS;
  } else if (result == CLOUD_LINK_REJECTED) {
    nextAttemptAt = millis() + CLOUD_REJECTED_RETRY_MS;
  } else {
    nextAttemptAt = millis() + retryDelay;
    retryDelay = min(retryDelay * 2, (unsigned long)CLOUD_RETRY_MAX_MS);
  }
}

void cloudPoll() {
  if (cloudRestartAt != 0 && !commandInProgress &&
      (long)(millis() - cloudRestartAt) >= 0) {
    Serial.flush();
    NVIC_SystemReset();
  }
  if (!cloudRadioIsWifi || cloudPolling) return;
  unsigned long interval = cloudSocketOpen ? CLOUD_POLL_OPEN_MS : CLOUD_POLL_IDLE_MS;
  if (millis() - cloudLastPollAt < interval) return;
  cloudLastPollAt = millis();
  cloudPolling = true;
  cloudStep();
  cloudPolling = false;
}

// ---- Settings ----

void writeCloudSettings(const CloudSettings& next) {
  writeEepromByte(CLOUD_SETTINGS_EEPROM_ADDR, 0);
  const uint8_t* bytes = (const uint8_t*)&next;
  for (size_t i = 0; i < sizeof(CloudSettings); i++) {
    writeEepromByte(CLOUD_SETTINGS_EEPROM_ADDR + 2 + i, bytes[i]);
    feedWatchdog();
  }
  writeEepromByte(CLOUD_SETTINGS_EEPROM_ADDR + 1, CLOUD_SETTINGS_EEPROM_LAYOUT);
  writeEepromByte(CLOUD_SETTINGS_EEPROM_ADDR, CLOUD_SETTINGS_EEPROM_MAGIC);
}

bool cloudSaveSettings(const CloudSettings& next) {
  loadCloudSettings();
  bool networkChanged = strcmp(next.ssid, cloudSettings.ssid) != 0 ||
                        strcmp(next.password, cloudSettings.password) != 0;
  writeCloudSettings(next);
  cloudSettings = next;
  if ((next.ssid[0] != '\0') != cloudRadioIsWifi) {
    cloudRestartAt = millis() + CLOUD_RESTART_DELAY_MS;
    return true;
  }
  if (!cloudRadioIsWifi) return false;
  if (networkChanged && cloudWifiStarted) {
    feedWatchdog();
    WiFi.disconnect();
    cloudBeginWifi(next);
  } else {
    cloudCloseSocket();
    cloudLinkState = CLOUD_LINK_UNCONFIGURED;
    nextAttemptAt = millis();
    retryDelay = CLOUD_RETRY_MIN_MS;
  }
  return false;
}

bool cloudForgetSettings() {
  CloudSettings next;
  memset(&next, 0, sizeof(next));
  writeCloudSettings(next);
  writeEepromByte(CLOUD_SETTINGS_EEPROM_ADDR, 0);
  cloudSettings = next;
  if (!cloudRadioIsWifi) return false;
  cloudRestartAt = millis() + CLOUD_RESTART_DELAY_MS;
  return true;
}

CloudSettings currentCloudSettings() {
  loadCloudSettings();
  return cloudSettings;
}

void cloudNetInfo(char* ip, int& rssi) {
  strcpy(ip, wifiIp);
  rssi = wifiRssi;
}
#endif  // WIFI_BACKEND_WIFIS3
