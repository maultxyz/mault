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
  **one** JSON-line response, in the order it was sent — there is no
  request ID, so a client must correlate responses positionally (send
  one command, read one response line, before sending the next).
- A line longer than 200 characters is discarded and answered with
  `{"error":"command too long"}`.
- Malformed JSON gets `{"error":"invalid JSON","reason":"...","length":N,"received":"<escaped input>"}`.
- An unrecognized (but validly-parsed) command gets `{"error":"unknown command"}`.
- On power-up the device prints `{"status":"ready","version":"1.0.2","board":"esp32"}`
  unprompted, before any command is sent. `board` is `"esp32"` or `"uno_r4"`
  - the app uses it to decide whether the device can be reflashed from the
  browser (ESP32 only) or needs a link to the GitHub repo instead.
- One other message is **unsolicited** and can arrive at any time
  between command/response pairs: `{"error":"jam","module":1}`, pushed
  if module 1's IR sensor sees a card continuously for 20 seconds
  outside of an active `route`. A client should watch for this
  independently of whatever response it's waiting on.

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
   / `setFeederConfig` — the device only remembers calibration for as
   long as it stays powered, so a client is responsible for restoring it
   after every reset.
5. Optionally run `{"test": true}` to sanity-check every servo before
   normal operation.

## Commands

All requests are single-line JSON objects, keyed on which top-level
field is present.

### `getStatus`
```json
{"getStatus": true}
```
→ `{"status":"ready","version":"1.0.2","board":"esp32"}`

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
Runs a full self-test sequence: opens every module's bottom + paddle →
sweeps every pusher left → sweeps every pusher right → resets all to
neutral → briefly spins the feeder (500ms) → stops it.
→ `{"status":"test_complete"}`

Refuses to run (and reports which module) if any module's gate sensor
already reads a card present, since the sequence sweeps every
trapdoor/paddle/pusher without regard for something already sitting in the
mechanism - clear it first (`clearDevice`) and retry. Doesn't check the
hopper sensor, since cards waiting to be fed are a normal state, not a jam.
→ `{"error":"module 2 sensor is blocked - clear the device before testing","module":2}`

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

### `setConfig` (calibration values — does not move anything)
```json
{
  "setConfig": {
    "module": 1,
    "bottomClosed": 400, "bottomOpen": 150,
    "paddleClosed": 420, "paddleOpen": 150,
    "pusherLeft": 150, "pusherNeutral": 230, "pusherRight": 300
  }
}
```
Every field except `module` is optional — omitted fields keep their
current stored value. These are raw PWM pulse values (same `120–490`
range as `servo`'s `value`), one pair/triple per servo defining its two
or three named positions. → `{"status":"ok","module":1}`

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
    "settleDuration": 500
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
  that module's IR sensor, 3s timeout each step), then either opens the
  target module's paddle and drives its pusher in the requested
  direction (`"left"`/`"right"`), or opens just the target module's own
  bottom to drop the card there (`"bottom"`).
- A card destined for a module's bottom output doesn't need to be the
  last module — any module can be targeted with `direction: "bottom"`.

→ `{"status":"routed","module":2,"direction":"left"}` on success.

## Error responses

| Response | When |
|---|---|
| `{"error":"module must be 1 to N"}` | `module` outside the valid range for the current channel offset |
| `{"error":"servo must be bottom, paddle, or pusher"}` | invalid `servo` field |
| `{"error":"invalid position"}` | `position` not valid for that servo type |
| `{"error":"direction must be left, right, or bottom"}` | invalid `direction` in `route` |
| `{"error":"empty: feeder hopper is out of cards","empty":true}` | feed attempted with no cards in the hopper |
| `{"error":"timeout: feeder did not deliver card to module 1","empty":false}` | feeder ran its full configured `duration` without module 1's IR triggering |
| `{"error":"timeout: no card detected at module N"}` | during routing, a card didn't advance to module *N* in time (3s) |
| `{"error":"invalid JSON","reason":"...","length":N,"received":"..."}` | line didn't parse as JSON |
| `{"error":"command too long"}` | line exceeded 200 characters |
| `{"error":"unknown command"}` | valid JSON, but no recognized top-level key |
| `{"error":"jam","module":1}` | **unsolicited** — module 1's IR saw a card continuously for 20s with no route in progress |
