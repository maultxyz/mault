# Sorting Machine Communication Protocol

This documents the serial wire protocol implemented by the sorting
machine's firmware (`main/main.ino`), running on an Arduino Uno R4
(the current build docs/BOM target) or an ESP32 (see the
`ARDUINO_ARCH_ESP32` pin block in `main.ino`). Any client that can open
a serial connection to the device can drive it by following this spec
— it does not assume any particular host language or application.

## Transport

- **9600 baud**. Uno R4 uses native USB CDC serial; most ESP32
  boards instead go through a UART-to-USB bridge chip, which looks
  identical to a client opening the port but does **not** share the
  Uno's reconnect-without-reset behavior described below — a host
  closing and reopening the port on one of those boards does reset the
  sketch (same as a classic Uno), so `{"getStatus": true}` still works
  either way but isn't the only source of a fresh ready/version line.
- ESP32-S2/S3 boards have their own native USB (no bridge chip). They
  must be built with **"USB Mode: Hardware CDC and JTAG"** and **"USB CDC
  On Boot: Enabled"** (`USBMode=hwcdc,CDCOnBoot=cdc` on the arduino-cli
  FQBN - see `firmware-release.yml`), and the client must be plugged into
  the chip's native USB port rather than a secondary UART-only port some
  of these boards also expose. This firmware used to instead own a
  manually-created `USBCDC`/USB-OTG connection so the device could report
  a custom "Mault Card Sorter" name, but that mode's software
  bootloader-reset handshake hits an unresolved upstream bug when
  connected directly to a PC (github.com/espressif/arduino-esp32#10204),
  which made this app's in-browser flashing (`use-serial.tsx`'s
  `flashEsp32`) unreliable. Hardware CDC/JTAG mode's reset handshake
  doesn't hit that bug, at the cost of the device enumerating under a
  fixed Espressif name/VID/PID instead of a custom one. Classic ESP32
  (WROOM/WROVER) has no native USB at all, so its bridge chip's fixed
  descriptor is what shows up instead - not something this firmware can
  change.
- **Framing:** one JSON object per line, terminated by `\n` (`\r` is
  also accepted as a line terminator). Every request produces exactly
  **one** JSON-line response, in the order it was sent.
- **Request sequence numbers (firmware 2.7.0+).** A command may carry
  `"seq": N` (an unsigned 32-bit integer, any position in the object). Every
  line written in response to it then starts with the same `"seq":N`, e.g.
  `{"seq":42,"route":{...}}` → `{"seq":42,"status":"routed",...}`. This
  includes `busy` rejections and the `fed` event emitted during that route.
  A client should match replies to requests by `seq` and drop any reply
  whose `seq` it isn't waiting for (a reply that arrives after its request
  timed out). Lines with no `seq` are the boot banner, unsolicited `jam`
  alerts, `command too long`, and `invalid JSON` (the device couldn't read a
  `seq` from those). Older firmware ignores `seq` and never echoes it, so a
  client can always send it and fall back to positional matching (send one
  command, read one response line) until it first sees a tagged reply.
- **One command at a time, across every transport.** While a command is
  executing (a `route` can take several seconds), the device keeps reading
  input and answers any new line immediately with
  `{"error":"busy","reason":"another command is in progress"}`, without
  running it. That rejection arrives **before** the in-progress command's own
  response. Without `seq`, a client that sent a second command while waiting
  on a first must match the `busy` reply to the second one, not the first;
  with `seq` the rejection carries the rejected command's number. Nothing is
  queued: resend once the first response has arrived. One exception: on the
  Uno R4 WiFi (ArduinoBLE backend), BLE input can't be read while a
  BLE-originated command is running, so a BLE line sent during a BLE command
  is only read (and then run normally) once that command finishes.
- A line longer than 255 characters is discarded and answered with
  `{"error":"command too long"}`.
- Malformed JSON gets `{"error":"invalid JSON","reason":"...","length":N,"received":"<escaped input>"}`.
- An unrecognized (but validly-parsed) command gets `{"error":"unknown command"}`.
- On power-up the device prints
  `{"status":"ready","version":"1.0.2","board":"esp32","id":"A1B2C3"}`
  unprompted, before any command is sent. `board` is `"esp32"` or `"uno_r4"`
  - the app uses it to decide whether the device can be reflashed from the
  browser (ESP32 only) or needs a link to the GitHub repo instead. `id` is
  a short (6 hex character) identifier for this specific physical board -
  the same value over Serial or BLE, and stable across power cycles and
  re-flashes, so a client can key a saved configuration to the board it's
  actually talking to. Sourced from whatever's factory-unique on the board
  (its Wi-Fi/BT MAC on ESP32 and the Uno R4 WiFi - see BLE transport below),
  falling back to a random value generated once and persisted to EEPROM on
  the Uno R4 Minima, which has no radio at all to read an address from.
- One other message is **unsolicited** and can arrive at any time
  between command/response pairs: `{"error":"jam","module":N}`, pushed
  if module *N*'s IR sensor sees a card continuously for 20 seconds
  with no servo activity (firmware 2.2.1+: the clock restarts on any
  servo move, so back-to-back cards fed in during a `feedNext` route never
  add up to a false jam; older firmware timed from when the sensor was
  last seen empty). A client should watch for this
  independently of whatever response it's waiting on. This check is
  purely informational - it doesn't move any servos, since nothing is
  actively trying to sort that card. Paddle-flap recovery only happens
  inline during an active `route`, on a card that fails to advance to
  the next module in time (see `route` below).
- A `route` sent with `"feedNext": true` (firmware 2.1.0+) also emits one
  `{"event":"fed",...}` line **before** its own response (see `route`
  below). Any line carrying an `event` key is never a command's
  response, so a client correlating responses positionally must skip it.

- Every build runs a watchdog: the Uno R4's hardware WDT (about 4s) and,
  from 2.7.0, the ESP32 task watchdog on the loop task (5s, the core's
  prebuilt setting). If the board ever hangs mid-command (typically a
  supply dip from servos wedging the MCU or its I2C bus), it reboots
  instead of going silent: the pending command
  never gets a response, USB/BLE drops, and the boot banner is sent again
  once a client reconnects. From 2.5.0 the device reloads its stored
  calibration (`storeConfig`) on boot, but anything only sent with
  `setConfig`/`setFeederConfig`/`setChannelOffset` and never stored is back
  to defaults, so a client should run the same sync as on a fresh connect.
  On a board whose port survives the reset (an ESP32 on its USB-to-UART
  bridge port), the link doesn't drop: the boot banner just arrives
  unprompted, with no `seq`, while the client still thinks it's connected.
  A client that has seen tagged replies on that connection should treat an
  untagged `{"status":"ready",...}` line as a reset: fail every pending
  request and redo the connect sync. From 2.8.0 `getStatus` also reports
  `uptimeMs`, so a client polling it can spot a reset whose banner it
  missed (the uptime goes down).

## BLE transport

ESP32-S3 and Uno R4 WiFi builds also advertise a BLE peripheral, so a client
can drive the device wirelessly instead of over USB - Uno R4 Minima has no
BLE hardware and is Serial-only. This carries the **exact same** line-
delimited JSON protocol documented below; only how bytes get to/from the
device differs. `main.ino`'s two backends (`ble_arduinoble.ino` for the Uno
R4 WiFi, `ble_esp32.ino` for the ESP32-S3) implement this identically from a
protocol standpoint.

- **Service:** the well-known Nordic UART Service (NUS) UUIDs, reused rather
  than inventing custom ones so generic BLE terminal apps (nRF Connect, etc.)
  can talk to the device for debugging without any app-specific tooling.
  - Service: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
  - RX characteristic (write / write-without-response — commands in):
    `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
  - TX characteristic (notify — responses and unsolicited messages out):
    `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`
- **Framing:** identical to Serial — one JSON object per line, `\n`-
  terminated. A single command or response line is **not** guaranteed to
  arrive in one BLE write/notify packet: both directions get chunked to the
  connection's negotiated MTU, so a client must reassemble by simply
  appending received bytes to a buffer and splitting on `\n`, exactly as it
  already does for Serial's byte stream. From 2.7.0 the ESP32-S3 accepts an
  MTU up to 517, sends each line (with its `\n`) in `MTU - 3` byte notifies,
  usually one per line, and reports the negotiated MTU as `bleMtu` in
  `getStatus` while a central is connected, so a client can size its own
  writes to `bleMtu - 3` instead of 20. It also asks the central for a 7.5
  to 30 ms connection interval on connect; a central may refuse, which
  leaves its default. The Uno R4 WiFi (ArduinoBLE) stays at the default
  23-byte MTU, so it chunks at 20 bytes and reports no `bleMtu`.
- **Response routing:** a command's response is sent back only on the
  transport it arrived on — if both Serial and BLE are connected at once,
  each keeps its own independent request/response correlation (the protocol
  is matched by `seq` on 2.7.0+, or positionally before that, see Transport
  above). The boot banner
  and the unsolicited `{"error":"jam",...}` message are the exception: they
  broadcast to every currently-connected transport, not just one.
- **Reliability:** BLE notifications aren't guaranteed delivery. A dropped
  chunk mid-line corrupts that one response; a client's existing timeout-
  based recovery (waiting for a response line, per the framing note above)
  handles this as a failed/garbled response, but there's no automatic retry
  of the specific request. This matches how generic BLE UART bridges behave.
  With `seq` (2.7.0+) a lost reply only fails its own request; without it,
  a client matching positionally can end up one reply behind.
- **Power-only operation:** BLE works with no USB host at all (e.g. only
  VIN powered). On boot the firmware waits at most 1.5s for a USB serial
  host before starting BLE, and on ESP32-S3 Hardware CDC builds USB writes
  never block when no host is attached. Without a USB host the boot banner
  only goes out over BLE once a central connects, so a client should send
  `{"getStatus": true}` after connecting.
- **Advertised name:** `"Mault Sorter XXXXXX"`, where `XXXXXX` is the same
  `id` reported in `getStatus`/the boot banner (see Transport above) - on
  these two boards, sourced from the BLE MAC (`BLE.address()` on the Uno R4
  WiFi's ArduinoBLE backend, `esp_read_mac(..., ESP_MAC_WIFI_STA)` on the
  ESP32-S3 Bluedroid backend, read before BLE even advertises). This exists
  so multiple physical units show up as distinct entries in a phone/OS
  Bluetooth picker before a client ever connects to one.

## Wi-Fi transport (ESP32 firmware 2.10.0+, Uno R4 WiFi from the first firmware release after 2.10.1)

ESP32 and Uno R4 WiFi builds can also join the user's Wi-Fi network and hold an
outbound WebSocket to the app's server, which relays it to a browser
anywhere. The sorter never accepts inbound connections, so it works behind
any home router without port forwarding. It carries the **exact same**
line-delimited JSON protocol as Serial and BLE: received lines go through
the same command dispatcher, and replies go back only on the transport the
command arrived on.

- **Setup:** over Serial or BLE, send `setWifi` (network) and `setCloud`
  (server URL plus a per-device token issued by the server), see Commands
  below. Both persist (NVS on ESP32, EEPROM on the Uno R4 WiFi) and survive
  reboots and reflashes; `clearWifi` forgets them.
- **Handshake:** the sorter opens `ws://` or `wss://` to the `setCloud` URL
  (`/sorter-link/device` on the API) with these headers:
  - `Authorization: Bearer <token>`
  - `X-Sorter-Id: <id>` (the same `id` as `getStatus`)
  - `X-Sorter-Firmware: <version>`

  `wss://` verifies the server against the ESP-IDF root CA bundle (on the
  Uno R4 WiFi, its co-processor's built-in root bundle). A `401`,
  `403` or `404` reply marks the link `rejected` and the sorter retries only
  every 5 minutes; any other failure retries with backoff from 1 s up to
  30 s.
- **Framing:** each WebSocket text message carries one or more whole
  `
`-terminated lines in either direction. Frames are at most 1024 bytes.
- **Keepalive:** the server pings every 20 s. The sorter answers pings and
  drops the link after 60 s without receiving anything.
- **Server relay:** the server forwards the sorter's lines to at most one
  browser at a time (`/sorter-link/client`). Before relaying, it sends the
  browser `{"sorterLink":"ready","firmware":"2.10.0"}`. It closes the browser
  socket with code `4404` when the sorter is offline or drops, and `4409`
  when another browser already holds the sorter. Rotating or revoking the
  token closes the sorter's socket with `4401`.
- **Concurrency:** on ESP32 all networking runs in its own FreeRTOS task on
  the core the Arduino loop doesn't use, so TLS handshakes never stretch
  servo timings. The Uno R4 WiFi has one core, so networking runs from the
  loop: while a command runs it only services an already-open socket, and
  joins and TLS handshakes wait until the sorter is idle.
- **Uno R4 WiFi radio sharing:** Wi-Fi and BLE share the board's ESP32-S3
  co-processor, so each boot uses one of them: a board with a saved network
  joins Wi-Fi and reports `"ble":"off"`, any other board advertises over
  BLE. A `setWifi` on a board without a saved network, and a `clearWifi` on
  one with a network, reply `{"status":"ok","restarting":true}` and restart
  the board about 300 ms later to switch modes. Over BLE that ends the
  connection.
- **Power safety:** joining Wi-Fi draws 300 to 500 mA spikes. The radio
  waits 2 s after boot so it doesn't start alongside the boot-time servo
  moves and BLE, transmits at 15 dBm, and after 2 brownout resets in a row
  stays off (`"wifi":"paused"`) so Serial and BLE remain usable. It resumes
  after a power cycle or the next `setWifi`/`setCloud`/`clearWifi`. 60 s of
  uptime clears the brownout count. The Uno R4 WiFi also waits 2 s after boot
  but has no brownout pause.

## Hardware model

- A **module** is one physical sorting stage: three positional SG90
  servos (`bottom` = trapdoor, `paddle` = gate, `pusher` = arm) plus its
  own IR sensor, occupying 3 consecutive channels on the onboard PCA9685
  servo driver (module *N* → channels `(N-1)*3 .. (N-1)*3+2`, shifted by
  the active channel offset).
- The **feeder** is a separate continuous-rotation servo on the channel
  right after the last addressable module, plus its own hopper IR sensor
  (separate from any module's IR) that reports whether cards remain in
  the stack.
- The channel offset (set via `setChannelOffset`) is `0` ("standard",
  up to 5 modules) or `4` ("legacy", up to 3 modules — channels 0-3 are
  reserved for older status LEDs on that layout). It must be set once
  per connection, before any other command, because it determines how
  many modules exist and therefore which module numbers are valid.
- The firmware has no concept of a "bin" — only modules and directions.
  A client that wants bin-style routing (mapping arbitrary logical bins
  to physical outputs) needs to keep that mapping on its own side and
  translate it to a `route` command.

## Recommended connection sequence

1. Open the serial port at 9600 baud.
2. Send `{"getStatus": true}` and read the response to confirm the
   device is alive and check its firmware `version`. Also useful after
   reopening a port without a physical power cycle: on native-USB boards
   (Uno R4) the sketch doesn't reset and won't print a fresh boot
   message on its own, so this is the only way to get one; on
   UART-bridge boards (most ESP32s) reopening does reset the sketch and
   print one unprompted, but sending this is still harmless and confirms
   the version either way.
3. Send `{"setChannelOffset": 0}` or `{"setChannelOffset": 4}` depending
   on which physical layout the machine uses.
4. Optionally push any calibration you want to (re)apply via `setConfig`
   / `setFeederConfig`. Before 2.5.0 the device only remembered
   calibration for as long as it stayed powered, so a client had to
   restore it after every reset. From 2.5.0 the device loads its stored
   calibration (`storeConfig`) on boot, so a client can read it with
   `getStoredConfig` and only push when it differs.
5. Optionally run `{"test": true}` to sanity-check every servo before
   normal operation.

## Commands

All requests are single-line JSON objects, keyed on which top-level
field is present.

### `getStatus`
```json
{"getStatus": true}
```
→ `{"status":"ready","version":"1.0.2","board":"esp32","id":"A1B2C3"}`

Firmware 2.2.2+ adds `"ble"` to this line and to the boot banner:
`"advertising"` (BLE is up and discoverable), `"connected"` (a central is
connected, so the device isn't advertising, since ArduinoBLE and this
firmware's Bluedroid backend accept one connection at a time),
`"unavailable"` (the BLE stack failed to start, e.g. the Uno R4 WiFi's
co-processor didn't answer `BLE.begin()` after 5 attempts; the device keeps
working over Serial), `"off"` (an Uno R4 WiFi whose radio is on Wi-Fi this
boot, see the Wi-Fi transport), or `"none"` (a board with no BLE hardware, such as the
Uno R4 Minima).

Firmware 2.7.0+ on the ESP32-S3 also adds `"bleMtu": N` to the `getStatus`
reply (not the boot banner) while a central is connected: the negotiated
ATT MTU, so a BLE client can write up to `N - 3` bytes per packet.

Firmware 2.8.0+ adds `"resetReason"` to both the boot banner and the
`getStatus` reply: why the board last started. One of `"power_on"`,
`"external"` (reset pin or button), `"software"` (a firmware restart, or a
flash or upload), `"watchdog"` (the board hung and the watchdog rebooted it),
`"brownout"` (supply voltage dipped, usually servo current on a weak supply),
`"panic"` (ESP32 crash), `"usb"` (ESP32 USB/JTAG reset, e.g. opening the
native USB port), `"other"` or `"unknown"`. The Uno R4 only reports
`"brownout"` when a voltage monitor reset is enabled. `getStatus` (not the
banner) also reports `"uptimeMs"`, milliseconds since boot (wraps after
about 49 days).

Firmware 2.9.0+ adds `"servoDriver"` to both the boot banner and the
`getStatus` reply: `"ok"` if the PCA9685 acknowledges its I2C address
(`0x40`), `"missing"` if it doesn't even after an I2C restart (unplugged,
unpowered logic side, or miswired SDA/SCL). It only checks the logic side: a
driver whose V+ servo supply is missing still reports `"ok"`.

Firmware 2.10.0+ on ESP32 (and the first firmware release after 2.10.1 on the Uno R4 WiFi) adds `"wifi"` (`"unconfigured"`, `"connecting"`,
`"connected"` or `"paused"`) and `"cloud"` (`"unconfigured"`, `"offline"`,
`"connecting"`, `"connected"` or `"rejected"`) to the `getStatus` reply. See
`getWifi` for details. The app treats the presence of `"wifi"` as the board
supporting Wi-Fi remote access.

### `setChannelOffset`
```json
{"setChannelOffset": 0}
```
`0` = standard layout, `4` = legacy layout. Also resets every servo to
neutral. → `{"status":"ok"}`

### `test`
```json
{"test": true}
```
Runs a full self-test sequence, one module at a time so only one module's
servos draw current at once: resets all to neutral, then for each module
opens its bottom + paddle → sweeps its pusher left → sweeps it right →
returns it to neutral, then briefly spins the feeder (500ms) → stops it.
Each servo's start is staggered, so the supply never sees every servo
starting together. Takes roughly 2 s per module, so up to about 12 s on a
5-module board. → `{"status":"test_complete"}`

Refuses to run (and reports which module) if any module's gate sensor
already reads a card present, since the sequence sweeps every
trapdoor/paddle/pusher without regard for something already sitting in the
mechanism - clear it first (`clearDevice`) and retry. Doesn't check the
hopper sensor, since cards waiting to be fed are a normal state, not a jam.
→ `{"error":"module 2 sensor is blocked - clear the device before testing","module":2}`

Firmware 2.9.0+ also refuses, before moving anything, if the PCA9685 doesn't
answer on I2C.
→ `{"error":"servo driver not detected - check the PCA9685 I2C wiring and power","servoDriver":"missing"}`

### `neutral`
```json
{"neutral": true}
```
Resets every module's bottom/paddle/pusher to closed/closed/neutral and
stops the feeder. → `{"status":"ok"}`

### `clearDevice`
```json
{"clearDevice": true}
```
Opens **every** module's bottom trapdoor at once (useful for flushing a
physically stuck card), then resets to neutral. → `{"status":"cleared"}`

### `servo` (manual single-servo move)
```json
{"servo": "bottom", "module": 1, "position": "open"}
```
or, to bypass calibrated positions and drive a raw pulse directly:
```json
{"servo": "bottom", "module": 1, "value": 250}
```
- `servo`: `"bottom" | "paddle" | "pusher"`
- `position`: `"open" | "closed"` (bottom/paddle), `"left" | "neutral" | "right"` (pusher)
- `value`: raw PWM pulse, clamped to `120–490`

→ `{"status":"ok","servo":"bottom","module":1}`, or
`{"error":"servo must be bottom, paddle, or pusher"}` /
`{"error":"invalid position"}` / `{"error":"module must be 1 to N"}`

#### Push safeguard (firmware 2.2.0+, always on since 2.3.0)

A pusher never moves off neutral unless its module's side paddle has been
commanded to its calibrated `paddleOpen` position and has had
that module's `paddleOpenDelay` (300 ms by default, set with `setConfig`
since 2.6.0; a fixed 300 ms before) to get there. The firmware has no paddle position
sensor, so it tracks the last position it commanded: any other paddle
pulse, or the idle servo release, counts as not open.

Since 2.3.0 this is enforced inside the firmware's single servo write path,
so it covers every pusher move (`servo`, `channel` writes that land on a
module's pusher channel, `route`, `pushTest`, the connect `test`) whether or
not a card is on the platform. Instead of refusing, a pusher move with the
paddle not known to be down lowers the paddle itself, waits out the rest of
`paddleOpenDelay`, then moves the pusher, so the command just takes up to
`paddleOpenDelay` ms longer and the paddle is left lowered. Returning a pusher to neutral
never touches the paddle.

2.2.x only applied the check while the module's IR sensor read a card, and
refused the move with
`{"error":"push_blocked","reason":"lower the side paddle before pushing a card","module":N}`
instead of lowering the paddle. 2.3.0+ never sends `push_blocked`; clients
still handle it for older firmware.

### `channel` (raw PCA9685 channel test)
```json
{"channel": 7, "value": 300}
```
Drives PCA9685 channel `channel` (0-15) at raw pulse `value` directly,
bypassing the module/servo mapping (`getChannel()`) and its module-range
validation entirely — unlike `servo` above, this works on a channel that
isn't wired into any module yet. For verifying a servo/channel works, or
finding which channel a given wire is on, during assembly or troubleshooting.
- `value`: raw PWM pulse, same `120–490` range as `servo`'s `value`
→ `{"status":"ok","channel":7}`, or `{"error":"channel must be 0 to 15"}`

### `channelStop`
```json
{"channelStop": 7}
```
Cuts PWM on a raw channel — needed after testing a continuous-rotation servo
via `channel` above, since (like the feeder) it has no neutral pulse that
stops it on its own. → `{"status":"ok","channel":7}`, or
`{"error":"channel must be 0 to 15"}`

### `setConfig` (calibration values — does not move anything)
```json
{
  "setConfig": {
    "module": 1,
    "bottomClosed": 400, "bottomOpen": 150,
    "paddleClosed": 420, "paddleOpen": 150,
    "pusherLeft": 150, "pusherNeutral": 230, "pusherRight": 300,
    "pusherHoldDuration": 150,
    "paddleCloseDelay": 150,
    "paddleOpenDelay": 300
  }
}
```
Every field except `module` is optional — omitted fields keep their
current stored value. `bottomClosed`/`bottomOpen`/`paddleClosed`/`paddleOpen`/
`pusherLeft`/`pusherNeutral`/`pusherRight` are raw PWM pulse values (same
`120–490` range as `servo`'s `value`), one pair/triple per servo defining
its two or three named positions. `pusherHoldDuration`,
`paddleCloseDelay` and `paddleOpenDelay` (firmware 2.6.0+, clamped to
0-5000) are different: they're durations in milliseconds, not pulses - see
`route` below for how they're used. `pusherHoldDuration` defaults to 150,
`paddleOpenDelay` to 300. → `{"status":"ok","module":1}`

### `pushTest` (tune push timings without a card)
```json
{"pushTest": {"module": 2, "direction": "left", "paddleOpenDelay": 300, "pusherHoldDuration": 150, "paddleCloseDelay": 1000}}
```
Runs only the left/right push step of `route` on `module`: opens its
paddle, waits `paddleOpenDelay` ms (2.6.0+), fires the pusher, retracts it after `pusherHoldDuration` ms, and
closes the paddle `paddleCloseDelay` ms after the pusher fired. No feed and
no IR checks. All timings are optional (default: the module's stored
`setConfig` values) and clamped to 0–5000 ms, so unsaved values can be
tried before committing them with `setConfig`.
→ `{"status":"pushed","module":2,"direction":"left"}`, or
`{"error":"module must be 1 to N"}` / `{"error":"direction must be left or right"}`.
Firmware older than this command answers `{"error":"unknown command"}`.

### `feeder`
```json
{"feeder": true}
```
Runs the feed sequence until module 1's IR sensor detects a card, the
hopper is found empty, or it times out.
→ `{"status":"ok","detected":true,"empty":false}`,
or on failure a `{"error":"...","empty":true|false}` shape (see Errors below).

### `feederValue` (raw PWM preview)
```json
{"feederValue": 315}
```
Drives the feeder servo at a raw pulse directly. **Does not auto-stop** —
a client must follow up with `feederStop` (or any other command that
resets state, like `neutral` or `test`) to stop the motor.
→ `{"status":"ok"}`

### `feederStop`
```json
{"feederStop": true}
```
Immediately cuts PWM on the feeder channel. → `{"status":"ok"}`

### `setFeederConfig`
```json
{
  "setFeederConfig": {
    "speed": 250,
    "duration": 3000,
    "pulseDuration": 80,
    "pauseDuration": 0,
    "settleDuration": 500,
    "reverseSpeed": 333,
    "reverseDuration": 0
  }
}
```
All fields optional/partial, same merge behavior as `setConfig`. Stops
the feeder as a side effect. → `{"status":"ok"}`

| Field | Meaning |
|---|---|
| `speed` | Raw PWM pulse driving the feeder motor while running |
| `duration` | Overall timeout (ms) to detect a card before giving up |
| `pulseDuration` | If `> 0`, run in pulsed mode: drive for this many ms, then check IR (`0` = continuous-drive mode instead) |
| `pauseDuration` | Pause (ms) between pulses in pulsed mode |
| `settleDuration` | Extra run time (ms) after detection, only when the hopper is now empty, so the last card (with nothing behind it) still fully clears into module 1 |
| `reverseSpeed` | Raw PWM pulse driving the feeder motor backward during rollback (the other side of the motor's stop point from `speed`). Firmware 2.4.0+ |
| `reverseDuration` | Rollback time (ms): once a feed delivers a card to module 1 and cards remain in the hopper, the roller runs backward this long so the next card, dragged forward by friction, is pulled back instead of creeping in behind it (a double feed). `0` (the default) turns it off. Firmware 2.4.0+; older firmware ignores both fields |

### `storeConfig` (firmware 2.5.0+)
```json
{"storeConfig": true}
```
Persists the current channel offset, every module's `setConfig` values and
the `setFeederConfig` values to EEPROM (data flash on the Uno R4, NVS on
ESP32), and the device applies them on every boot. `setConfig`,
`setFeederConfig` and `setChannelOffset` never persist by themselves, so a
client can try unsaved values freely and only send `storeConfig` once they
are final. Writes only when something changed, to spare the flash.
→ `{"status":"ok","written":true}` (`false` when the stored copy already
matched).

### `getStoredConfig` (firmware 2.5.0+)
Reads back what `storeConfig` saved, one section per line so every reply
fits the 255-byte line limit.

```json
{"getStoredConfig": true}
```
→ `{"status":"ok","stored":true,"dirty":false,"channelOffset":0,"modules":5}`.
`stored` is `false` (with no other fields) until the first `storeConfig`.
Since 2.6.0 the stored layout includes `paddleOpenDelay`; calibration
stored by 2.5.0 still loads, with `paddleOpenDelay` at its 300 ms default.
`dirty` is `true` when the values in use differ from the stored copy
(e.g. after an unsaved `setConfig`). `modules` is how many module entries
are stored.

```json
{"getStoredConfig": 2}
```
→ `{"status":"ok","module":2,"bottomClosed":300,...}` with the same fields
as `setConfig`.

```json
{"getStoredConfig": "feeder"}
```
→ `{"status":"ok","feeder":{"speed":315,...}}` with the same fields as
`setFeederConfig`.

Both section forms answer `{"error":"no stored config"}` before the first
`storeConfig`. Older firmware answers `{"error":"unknown command"}`.

### Wi-Fi commands (ESP32 firmware 2.10.0+, Uno R4 WiFi from the first firmware release after 2.10.1)

Older firmware and boards without Wi-Fi (the Uno R4 Minima) answer
`{"error":"unknown command"}`. On the Uno R4 WiFi, a `setWifi` or
`clearWifi` that switches the radio between BLE and Wi-Fi answers
`{"status":"ok","restarting":true}` and restarts the board (see Uno R4
WiFi radio sharing above).

```json
{"setWifi": {"ssid": "Home", "password": "hunter22"}}
```
Stores the network and (re)joins it. `ssid` is 1 to 32 bytes, `password` is
empty (open network) or 8 to 64 characters. Only 2.4 GHz networks work.
→ `{"status":"ok"}`, or `{"error":"ssid must be 1 to 32 bytes"}` /
`{"error":"password must be empty or 8 to 64 characters"}`.

```json
{"setCloud": {"url": "wss://mault.example.com/api/sorter-link/device", "token": "mvs_..."}}
```
Stores the server link and reconnects. `url` is a `ws://` or `wss://`
address up to 150 characters, `token` is 16 to 80 characters (the server
issues it per device record). → `{"status":"ok"}`, or an `{"error":...}`
naming the bad field.

```json
{"clearWifi": true}
```
Forgets the network and the server link and turns the radio off.
→ `{"status":"ok"}`

```json
{"getWifi": true}
```
→ `{"status":"ok","wifi":"connected","ssid":"Home","ip":"192.168.1.40","rssi":-58,"cloud":"connected","host":"mault.example.com"}`.
`wifi` is `"unconfigured"`, `"connecting"`, `"connected"` or `"paused"`
(see Power safety above). `ssid` is present once set, `ip` and `rssi` only while joined, `host` once a
valid `setCloud` URL is stored. `cloud` is `"rejected"` when the server
refused the token (set it up again with a fresh token).

### `readIR`
```json
{"readIR": true}
```
→ `{"status":"ok","ir":[true,false,false],"hopper":true}`

`ir` is one boolean per addressable module (array length = the current
max module count for the active channel offset), `true` meaning a card
is present. `hopper` is `true` while cards remain in the feeder stack.

### `route` (the normal per-card sorting command)
```json
{"route": {"module": 2, "direction": "left"}}
```
- `direction`: `"left" | "right" | "bottom"`
- Runs the feeder first, then routes the card: opens each preceding
  module's bottom in turn to advance the card (confirming arrival via
  that module's IR sensor, 3s timeout each step - if a step times out,
  flaps that module's paddle once, the same recovery `jam` handling uses,
  then gives the card one more 3s window before reporting failure), then
  either opens the target module's paddle and drives its pusher in the
  requested direction (`"left"`/`"right"`), or opens just the target
  module's own bottom to drop the card there (`"bottom"`).
- For a `"left"`/`"right"` push, the target module's paddle opens first
  and gets `paddleOpenDelay` ms (per-module, via `setConfig`, firmware
  2.6.0+; a fixed 300 ms before) to lower before the pusher fires. Then
  two timings run independently once the pusher fires: the pusher itself returns to neutral after
  `pusherHoldDuration` ms (per-module, via `setConfig`: long enough to
  complete its stroke and fling the card, short enough not to stall
  against the mechanical stop for long); the
  target module's paddle instead closes `paddleCloseDelay` ms after the
  pusher fired (per-module, via `setConfig`) - independent of the pusher's
  own timing, so the paddle can be tuned to stay open longer than the
  pusher is held, to make sure the card has actually cleared before the
  gate closes.
- A card destined for a module's bottom output doesn't need to be the
  last module — any module can be targeted with `direction: "bottom"`.

→ `{"status":"routed","module":2,"direction":"left"}` on success.

#### `feedNext` (firmware 2.1.0+)
```json
{"route": {"module": 3, "direction": "left", "feedNext": true}}
```
Feeds the next card into module 1 as part of this route, so a client can
start scanning it while this card is still travelling. Once the routed
card has reached module 2 and module 1's IR sensor reads clear, module 1's
bottom closes and the feeder runs. If the target is module 1 itself (or
module 1's sensor never clears within 3s), the feed runs after the card
has been pushed/dropped instead. Either way, exactly one extra line is
sent before the final response, from the same transport:

- `{"event":"fed","status":"ok","detected":true,"empty":false}` when a card arrived at module 1
- `{"event":"fed","error":"empty: feeder hopper is out of cards","empty":true}` or
  `{"event":"fed","error":"timeout: feeder did not deliver card to module 1","empty":false}` otherwise

A failed mid-route feed doesn't abort the route. The final response then
carries `"fedNext":true`, e.g.
`{"status":"routed","module":3,"direction":"left","fedNext":true}`, so a
client can tell a firmware that honored the flag from an older one that
silently ignored it (older firmware sends no event and no `fedNext`). If
the route itself fails after the mid-route feed, the `fed` event has
already been sent and the next card is sitting in module 1. Allow extra
response time for the feed (the web client waits 25s instead of 15s).

## Error responses

| Response | When |
|---|---|
| `{"error":"module must be 1 to N"}` | `module` outside the valid range for the current channel offset |
| `{"error":"channel must be 0 to 15"}` | `channel`/`channelStop` outside the PCA9685's addressable range |
| `{"error":"servo must be bottom, paddle, or pusher"}` | invalid `servo` field |
| `{"error":"invalid position"}` | `position` not valid for that servo type |
| `{"error":"direction must be left, right, or bottom"}` | invalid `direction` in `route` |
| `{"error":"empty: feeder hopper is out of cards","empty":true}` | feed attempted with no cards in the hopper |
| `{"error":"timeout: feeder did not deliver card to module 1","empty":false}` | feeder ran its full configured `duration` without module 1's IR triggering |
| `{"error":"timeout: no card detected at module N"}` | during routing, a card didn't advance to module *N* in time (3s, plus one paddle-flap retry and another 3s) |
| `{"error":"servo driver not detected - ...","servoDriver":"missing"}` | firmware 2.9.0+: `test` while the PCA9685 doesn't answer on I2C |
| `{"error":"invalid JSON","reason":"...","length":N,"received":"..."}` | line didn't parse as JSON |
| `{"error":"command too long"}` | line exceeded 255 characters |
| `{"error":"push_blocked","reason":"lower the side paddle before pushing a card","module":N}` | firmware 2.2.x only: a `servo`/`channel` pusher move while a card is on module *N*'s platform and its side paddle isn't down (see Push safeguard) |
| `{"error":"busy","reason":"another command is in progress"}` | a line arrived while another command (from any transport) was still executing; the line was not run |
| `{"error":"unknown command"}` | valid JSON, but no recognized top-level key |
| `{"error":"jam","module":N}` | **unsolicited** — module *N*'s IR saw a card continuously for 20s with no servo activity (informational only - no paddle-flap is attempted since nothing is actively sorting) |
