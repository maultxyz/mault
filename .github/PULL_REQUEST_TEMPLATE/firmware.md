## Summary

<!-- What does this change do, and why? -->

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Wire protocol change
- [ ] Refactor / other

## Protocol impact

- [ ] N/A — no change to the serial wire protocol
- [ ] `firmware/PROTOCOL.md` updated to match
- [ ] Web serial client (`packages/web/src/features/scanner/`) updated in this PR (or linked PR: <!-- # -->) to stay in sync — the firmware can't be hot-reloaded the way the app can, so mismatches only surface on real hardware

## Hardware verification

<!-- Which board(s) did you actually flash and test on? -->

- [ ] ESP32 (esp32:esp32:esp32)
- [ ] Arduino Uno R4 Minima (arduino:renesas_uno:minima)
- [ ] Arduino Uno R4 WiFi (arduino:renesas_uno:unor4wifi)
- [ ] Compiles cleanly for all three FQBNs (`arduino-cli compile --fqbn <fqbn> --export-binaries firmware/main`)
- [ ] BLE connect + command round-trip tested on ESP32-S3 (Minima has no BLE hardware — Serial-only there)
- [ ] BLE connect + command round-trip tested on Uno R4 WiFi

## Checklist

- [ ] `FIRMWARE_VERSION` in `firmware/main/main.ino` left as-is — CI (`firmware-release.yml`) bumps and tags it on merge to `master`, don't hand-edit unless there's a specific reason
- [ ] Bin routing changes (if any) stay on the web side (`shared/interfaces/bin-routes.interface.ts`) — firmware has no concept of a "bin", only `(module, direction)` moves

## Related issue

<!-- Closes #... -->
