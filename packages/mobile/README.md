# @magic-vault/mobile

Native iOS and Android app (Expo SDK 58, React Native 0.88, Expo Router). It scans cards with the phone camera, drives a sorter over Bluetooth, and browses collections, stats and live sessions.

## What it does

- **Collections, stats, live monitor**: the same `/api/*` endpoints and SSE stream as the web app.
- **Sorter over Bluetooth**: ESP32-S3 and Uno R4 WiFi boards over the Nordic UART service (`firmware/PROTOCOL.md`, "BLE transport"). The Uno R4 Minima is USB only, and iOS can't talk USB serial, so it stays desktop only.
- **On-device scanning**: corner detector and Milo embedder through `onnxruntime-react-native`, using the same pinned weights, preprocessing and matching flow as the web scanner (`shared/src/vision.ts`). Feed, capture, identify, route and save run in `features/scanner/api/use-scan-session.ts`.

Not on the phone yet: calibration, bin/preset editing, repack and auto-assign presets, card corrections, billing, account creation and firmware flashing. Use the web app for these.

## Requirements

- An Apple Developer account and a physical iPhone. The simulator has no Bluetooth or camera.
- [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`). iOS builds run in the EAS cloud, so a Mac isn't needed.
- Expo Go can't run this app (it uses native modules). Install a development build instead.

## Configuration

`app.config.ts` reads the root `.env` (when present), then these overrides:

| Variable | Default | Notes |
| --- | --- | --- |
| `MOBILE_API_URL` | `https://mault.xyz` | Origin that serves `/api/*`. For a local server, use `http://<LAN-IP>:5173` with `pnpm --filter @magic-vault/web dev -- --host`. |
| `MOBILE_WEB_URL` | `https://mault.xyz` | Sent as `Origin` to Neon Auth (must be a trusted origin), and used for the sign-up link. |
| `MOBILE_AUTH_PROVIDER` | `AUTH_PROVIDER`, else `neon` | `neon` or `local`. |
| `MOBILE_NEON_AUTH_URL` | `VITE_NEON_AUTH_URL` | Neon Auth base URL. |
| `MOBILE_IOS_BUNDLE_ID` | `xyz.mault.app` | |
| `MOBILE_ANDROID_PACKAGE` | `xyz.mault.app` | |
| `EAS_PROJECT_ID` | | Set by `eas init`. |

On EAS, set these as EAS environment variables, because the root `.env` isn't uploaded.

## Running it

```bash
pnpm install
cd packages/mobile
eas init                                   # once, links the EAS project
pnpm build:ios:dev                         # development build, install it from the link EAS prints
pnpm start                                 # Metro for the dev build
```

Release builds: `pnpm build:ios:preview` (ad hoc install on registered devices) and `pnpm build:ios:prod` followed by `pnpm submit:ios`.

## Testing on Android (no Apple account needed)

Android builds need no paid account and run on Windows.

- **Emulator:** install Android Studio, create a device (Play Store image, x86_64), and under its camera settings set the back camera to `Webcam0`. Then either `pnpm android` (local build, needs the Android SDK and JDK 17) or `pnpm build:android:dev` (EAS cloud build, free tier) and drag the APK onto the emulator. Run `pnpm start` for Metro.
- **What works in the emulator:** sign-in, collections, stats, live monitor, and the full scan pipeline through "Scan one" with a card held up to your webcam. Bluetooth isn't available, so the Sorter tab and auto-feed can't be tested there.
- **Physical Android phone:** install the same APK (allow installs from unknown sources) to test the sorter over Bluetooth too. Over USB (USB debugging on), set `MOBILE_API_URL=http://localhost:5173` and run `pnpm start:usb` instead of `pnpm start`: it forwards ports 8081 and 5173 with `adb reverse` and points the dev client at `127.0.0.1`, so Windows Firewall and Wi-Fi don't matter. Run the web dev server with `--host` (`pnpm --filter @magic-vault/web dev --host`); Expo's `--localhost` flag binds IPv6 only and breaks the forward.

The first scan downloads the two ONNX models from Hugging Face (pinned by revision and SHA-256) and caches them in the app's documents directory.
