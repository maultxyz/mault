// Wi-Fi remote link, the parts shared by every Wi-Fi backend: joins the
// user's Wi-Fi network and holds a WebSocket to the app's server, which relays
// commands from a browser anywhere (see PROTOCOL.md's Wi-Fi transport
// section). It carries the exact same line-delimited JSON protocol as Serial
// and BLE: received lines go through feedByte()/handleCommand() like any other
// transport, so busy handling, seq tagging and per-transport replies all
// behave identically.
//
// The backends supply the radio, the sockets and settings storage:
//   - cloud_esp32.ino: any ESP32, networking in its own FreeRTOS task.
//   - cloud_wifis3.ino: the Uno R4 WiFi, whose radio lives on its ESP32-S3
//     co-processor and is driven over AT commands from the loop.
// Each one implements the hooks declared below (cloudSaveSettings(),
// cloudForgetSettings(), currentCloudSettings(), cloudNetInfo(),
// cloudFillRandom() and cloudIdle()).
#if WIFI_SUPPORTED

#define CLOUD_SSID_MAX 32
#define CLOUD_PASSWORD_MAX 64
#define CLOUD_PASSWORD_MIN 8
// Keeps a setCloud line (seq + url + token) under MAX_CMD_LEN.
#define CLOUD_URL_MAX 150
#define CLOUD_TOKEN_MIN 16
#define CLOUD_TOKEN_MAX 80
#define CLOUD_HOST_MAX 96
#define CLOUD_PATH_MAX 128

#define CLOUD_MAX_FRAME 1024
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

struct CloudUrl {
  bool secure;
  uint16_t port;
  char host[CLOUD_HOST_MAX + 1];
  char path[CLOUD_PATH_MAX + 1];
};

// Manual prototypes for everything taking these structs (see main.ino's
// comment on the Arduino builder hoisting its own above the struct).
bool parseCloudUrl(const char* url, CloudUrl& out);
uint8_t wsHandshake(Client& client, const CloudUrl& url, const char* token);
// Backend hooks. cloudSaveSettings() and cloudForgetSettings() return true
// when the board restarts to apply the change (the reply says so first).
bool cloudSaveSettings(const CloudSettings& next);
bool cloudForgetSettings();
CloudSettings currentCloudSettings();
void cloudNetInfo(char* ip, int& rssi);
void cloudFillRandom(uint8_t* buf, size_t len);
void cloudIdle();

volatile uint8_t wifiLinkState = WIFI_LINK_UNCONFIGURED;
volatile uint8_t cloudLinkState = CLOUD_LINK_UNCONFIGURED;

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

// Standard base64, enough for the 16-byte Sec-WebSocket-Key nonce. `out`
// needs 4 * ceil(len / 3) + 1 bytes.
void cloudBase64(const uint8_t* in, size_t len, char* out) {
  static const char alphabet[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  size_t o = 0;
  for (size_t i = 0; i < len; i += 3) {
    uint32_t n = (uint32_t)in[i] << 16;
    if (i + 1 < len) n |= (uint32_t)in[i + 1] << 8;
    if (i + 2 < len) n |= in[i + 2];
    out[o++] = alphabet[(n >> 18) & 0x3F];
    out[o++] = alphabet[(n >> 12) & 0x3F];
    out[o++] = i + 1 < len ? alphabet[(n >> 6) & 0x3F] : '=';
    out[o++] = i + 2 < len ? alphabet[n & 0x3F] : '=';
  }
  out[o] = '\0';
}

// ---- WebSocket client (RFC 6455, client side only) ----
// Small enough to own outright instead of pulling in a library: text frames
// out (masked, as clients must), text/ping/close frames in. Works over any
// Arduino Client, plain or TLS.

bool wsReadExact(Client& client, uint8_t* buf, size_t len) {
  unsigned long start = millis();
  size_t got = 0;
  while (got < len) {
    if (!client.connected()) return false;
    int n = client.read(buf + got, len - got);
    if (n > 0) {
      got += n;
      continue;
    }
    if (millis() - start > CLOUD_FRAME_READ_TIMEOUT_MS) return false;
    cloudIdle();
  }
  return true;
}

int wsReadLine(Client& client, char* buf, size_t len, unsigned long deadline) {
  size_t n = 0;
  while ((long)(deadline - millis()) > 0) {
    if (!client.connected() && !client.available()) return -1;
    int c = client.read();
    if (c < 0) {
      cloudIdle();
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

bool wsSendFrame(Client& client, uint8_t opcode, const uint8_t* data, size_t len) {
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
  cloudFillRandom(mask, sizeof(mask));
  memcpy(cloudTxFrame + h, mask, 4);
  h += 4;
  for (size_t i = 0; i < len; i++) cloudTxFrame[h + i] = data[i] ^ mask[i % 4];
  return client.write(cloudTxFrame, h + len) == h + len;
}

// Upgrades an already-open connection to a WebSocket. Returns
// CLOUD_LINK_CONNECTED, CLOUD_LINK_REJECTED (the server refused the token) or
// CLOUD_LINK_OFFLINE (anything network-shaped, worth retrying). The caller
// closes the connection on anything but CLOUD_LINK_CONNECTED.
uint8_t wsHandshake(Client& client, const CloudUrl& url, const char* token) {
  uint8_t keyRaw[16];
  cloudFillRandom(keyRaw, sizeof(keyRaw));
  char key[25];
  cloudBase64(keyRaw, sizeof(keyRaw), key);

  bool defaultPort = (url.secure && url.port == 443) || (!url.secure && url.port == 80);
  char hostHeader[CLOUD_HOST_MAX + 8];
  if (defaultPort) {
    snprintf(hostHeader, sizeof(hostHeader), "%s", url.host);
  } else {
    snprintf(hostHeader, sizeof(hostHeader), "%s:%u", url.host, url.port);
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
           url.path, hostHeader, key, token, deviceId, FIRMWARE_VERSION);
  size_t requestLen = strlen(request);
  if (client.write((const uint8_t*)request, requestLen) != requestLen) {
    return CLOUD_LINK_OFFLINE;
  }

  unsigned long deadline = millis() + CLOUD_HANDSHAKE_TIMEOUT_MS;
  char line[160];
  if (wsReadLine(client, line, sizeof(line), deadline) < 12 ||
      strncmp(line, "HTTP/1.1 ", 9) != 0) {
    return CLOUD_LINK_OFFLINE;
  }
  int status = atoi(line + 9);
  while (true) {
    int n = wsReadLine(client, line, sizeof(line), deadline);
    if (n < 0) return CLOUD_LINK_OFFLINE;
    if (n == 0) break;
  }
  if (status != 101) {
    return status == 401 || status == 403 || status == 404 ? CLOUD_LINK_REJECTED
                                                           : CLOUD_LINK_OFFLINE;
  }
  return CLOUD_LINK_CONNECTED;
}

// Reads every complete frame waiting on the socket, handing message payloads
// to onData. Returns false once the link is gone (closed by either side, a
// protocol error, or idle timeout).
bool wsReadFrames(Client& client, unsigned long& lastRxAt,
                  void (*onData)(const uint8_t*, size_t)) {
  if (!client.connected()) return false;
  while (client.available() >= 2) {
    uint8_t header[2];
    if (!wsReadExact(client, header, 2)) return false;
    uint8_t opcode = header[0] & 0x0F;
    bool masked = header[1] & 0x80;
    size_t len = header[1] & 0x7F;
    if (len == 126) {
      uint8_t ext[2];
      if (!wsReadExact(client, ext, 2)) return false;
      len = ((size_t)ext[0] << 8) | ext[1];
    } else if (len == 127) {
      return false;
    }
    if (len > CLOUD_MAX_FRAME) return false;
    uint8_t mask[4] = {0, 0, 0, 0};
    if (masked && !wsReadExact(client, mask, 4)) return false;
    if (len > 0 && !wsReadExact(client, cloudFrame, len)) return false;
    if (masked) {
      for (size_t i = 0; i < len; i++) cloudFrame[i] ^= mask[i % 4];
    }
    lastRxAt = millis();

    switch (opcode) {
      case WS_OP_TEXT:
      case WS_OP_BINARY:
      case WS_OP_CONTINUATION:
        onData(cloudFrame, len);
        break;
      case WS_OP_PING:
        if (len <= 125) wsSendFrame(client, WS_OP_PONG, cloudFrame, len);
        break;
      case WS_OP_CLOSE:
        wsSendFrame(client, WS_OP_CLOSE, cloudFrame, len < 2 ? len : 2);
        return false;
      default:
        break;
    }
  }
  return millis() - lastRxAt <= CLOUD_IDLE_TIMEOUT_MS;
}

// ---- Commands ----

void printWifiStatus(Print& reply) {
  CloudSettings s = currentCloudSettings();
  char ip[16];
  int rssi;
  cloudNetInfo(ip, rssi);

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

void printSavedReply(bool restarting, Print& reply) {
  if (restarting) {
    reply.println(F("{\"status\":\"ok\",\"restarting\":true}"));
  } else {
    reply.println(F("{\"status\":\"ok\"}"));
  }
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
    printSavedReply(cloudSaveSettings(next), reply);
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
    printSavedReply(cloudSaveSettings(next), reply);
    return true;
  }

  if (isTrue(doc["clearWifi"])) {
    printSavedReply(cloudForgetSettings(), reply);
    return true;
  }

  if (isTrue(doc["getWifi"])) {
    printWifiStatus(reply);
    return true;
  }

  return false;
}
#endif  // WIFI_SUPPORTED
