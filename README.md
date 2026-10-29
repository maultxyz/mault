# Mault

An open-source trading card scanner and physical sorter. A camera identifies each card with on-device image embeddings, a rule engine picks its bin, and a feeder plus servo modules driven by an Arduino or ESP32 drop it there. Collections, storage boxes, prices, stats and integrations live in the same app.

- Hosted app: [mault.xyz](https://mault.xyz)
- Printable sorter: [MakerWorld](https://makerworld.com/en/models/3066180-tcg-card-sorting-machine)
- Build guide (BOM, wiring, assembly): `/build` in the app

## Supported games

Magic: The Gathering, Pokemon, Yu-Gi-Oh, One Piece, Lorcana, Gundam, Flesh and Blood, Riftbound, Grand Archive, Star Wars: Unlimited, Cyberpunk.

Each game is a pluggable adapter (`packages/server/src/lib/adapters/<game>/`) plus a `Game` row in the admin Games Manager, whose field definitions drive rules, sorting, filters and notifications for that game.

## How it works

1. The feeder pushes a card from the hopper into the camera's calibrated scan region and waits for it to settle at the IR sensor.
2. The client finds the card's four corners, dewarps it and embeds it with [CollectorVision](https://github.com/HanClinto/CollectorVision)'s corner detector and Milo embedder (ONNX, in the browser or on the phone). If the client can't run the models, the server embeds the image instead.
3. The server finds the closest cards with a pgvector HNSW search. When printings look alike, OCR of the name, set and number breaks the tie; weak matches are flagged for review.
4. The collection's active bin preset decides the bin (rules, auto-assign, repack, alphabetical, chaos, pick lists, overflow and copy limits), client-side.
5. The client tells the sorter which module and direction to use, over USB serial, Bluetooth or Wi-Fi, and saves the scan in parallel.

## Features

**Scanning**

- Webcam scanning in the browser, or a paired phone used as the camera (QR pairing)
- Several sorters from one browser tab, each with its own camera and collection
- Multi-language scanning, OCR tie-breaking, a review mode for low-confidence matches and one-click corrections
- Offline-tolerant saves: scans queue in IndexedDB and retry until the server accepts them

**Sorting**

- Bin presets per collection with and/or rule trees over each game's own fields, plus override bins that win over ordinary ones
- Auto bin assignment, repack building, alphabetical drill-down, chaos sort, overflow bins, copy limits and decklist pick lists
- Custom sounds played when matching cards are sorted

**Collections and value**

- Multiple organizations and collections, with roles, invites and an audit log
- Storage locations: empty a bin into a box and Mault records each card's position, searchable and exportable as CSV
- Prices from TCGplayer, Cardmarket and Card Kingdom, with per-org price source and condition multipliers
- Stats, a leaderboard and live remote monitoring (or a shareable read-only monitor link)

**Integrations**

- Discord bot: `/link` a server to an org, `/stats` for collection stats; scan, alert and rule-based channels are configured in Settings > Integrations
- Public REST API with org API keys and signed webhooks, following Scryfall's conventions ([docs/public-api.md](docs/public-api.md), reference site in `packages/api-docs`)

**Hardware**

- Calibration for servos, feeder, bin heights, routes and the camera's scan region, with a guided tour
- In-browser firmware flashing, firmware feature gating, device self-test and session locks
- Wi-Fi remote control for ESP32 boards, relayed through the server
- Native iOS/Android app ([packages/mobile](packages/mobile/README.md)) that scans with the phone camera and drives a sorter over Bluetooth

**Plans**

- Free and Business tiers (Stripe), with features and limits editable in Admin > Plans

## Repository layout

```
packages/
├── shared/    @magic-vault/shared    types, constants, zod schemas, rule engine, vision + serial protocol (no build step)
├── server/    @magic-vault/server    Hono API, Drizzle schema, auth providers, sync and price jobs
├── web/       @magic-vault/web       React SPA: landing, build guide, scanner, calibration, admin
├── mobile/    @magic-vault/mobile    Expo iOS/Android app
├── bot/       @magic-vault/bot       Discord bot, talks to the server over HTTP only
└── api-docs/  @magic-vault/api-docs  Scalar reference for the public API (openapi.json)
firmware/      Sorter sketch (firmware/main/*.ino) and wire protocol (firmware/PROTOCOL.md)
3d model/      Fusion 360 / STEP source and printable .3mf
drizzle/       Generated SQL migrations
docs/          Public API guide
docker/        Web container start-up script (runtime env.js)
scripts/       Release and version helpers, plus scripts/pi for a Raspberry Pi host
.github/       Build check, deploy, firmware PR check and firmware release workflows
```

`CLAUDE.md` records the project's conventions and invariants; `CONTRIBUTING.md` covers the dev workflow and database changes.

## Stack

- **Web**: React 19, Vite, React Router v7, Tailwind CSS 4, TanStack Query, React Hook Form + Zod, onnxruntime-web
- **Server**: Hono 4, Drizzle ORM, PostgreSQL with pgvector (Neon or self-hosted), onnxruntime-node (PaddleOCR text detection and recognition)
- **Mobile**: Expo, React Native, onnxruntime-react-native, BLE
- **Auth**: `AUTH_PROVIDER=neon` ([Neon Auth](https://neon.com), JWT via JWKS) or `local` ([own-auth](https://own-auth.com), bearer sessions in your own Postgres)
- **Hardware**: Arduino Uno R4 Minima / R4 WiFi or ESP32(-S3), PCA9685 servo driver, SG90 servos
- **Monorepo**: pnpm workspaces + Turborepo

## Getting started

For a production install, follow the step-by-step guide at [mault.xyz/self-host](https://mault.xyz/self-host). This section covers development.

Mault needs Postgres with pgvector and an identity provider, picked with `AUTH_PROVIDER` / `VITE_AUTH_PROVIDER`:

- **`neon`** (default): a hosted [Neon](https://neon.com) project. The free tier is enough.
- **`local`**: fully self-hosted. `docker-compose.yml` runs Postgres, the API, the web app and the API docs. A Raspberry Pi can host the same local-auth app with `scripts/pi/install.sh` ([Raspberry Pi](#raspberry-pi)).

Both read one `.env` in the repo root:

```bash
cp .env.neon.example .env      # Neon
cp .env.docker.example .env    # local
```

### Neon

1. Create a project at [console.neon.tech](https://console.neon.tech) and run `CREATE EXTENSION IF NOT EXISTS vector;`.
2. Enable **Neon Auth** (Dashboard > Auth) **before** migrating: the RLS policies use its `authenticated` role and `auth.user_id()`.
3. Set `DATABASE_URL` (pooled), `NEON_AUTH_URL` and `VITE_NEON_AUTH_URL` (same URL) and `VITE_NEON_DATA_API_URL`.
4. Migrate and run:
   ```bash
   pnpm install
   pnpm --filter @magic-vault/server db:migrate
   pnpm dev        # web :5173, API :3001, API docs :5174
   ```

### Local

1. In `.env`, set `POSTGRES_PASSWORD`, `OWN_AUTH_TOKEN_PEPPER`, `IMPERSONATION_SECRET` and `MONITOR_LINK_SECRET` (`openssl rand -hex 32` each).
2. `docker compose up -d`, then open `http://localhost:8080` and sign up. The first account becomes platform admin with a "Home" organization.
3. In `/app/admin`, add a game in the Games Manager and sync it. Scans can't match until one has synced.

The `server` container runs every migration and `packages/server/src/db/bootstrap-local.sql` on start (`pnpm db:migrate-local`, idempotent). Postgres listens only on `127.0.0.1:5433`. Email verification, profile/password editing, multi-session management and social sign-in are Neon-only.

Optional: `API_URL` (public API base for `next_page` links), `SORTER_LINK_URL` (see [Wi-Fi remote](#wi-fi-remote)), `WEBHOOK_ALLOW_INSECURE_URLS=true` (webhooks to `http://` and LAN addresses; keep it off on public servers).

To make another user platform admin (no UI yet):

```sql
INSERT INTO platform_user_roles (user_id, role) VALUES ('<own_auth_users.id>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Raspberry Pi

A Raspberry Pi can host the local-auth app and run the sorter. Postgres is the Pi's own server on port 5432, not Docker. The scanner camera is a USB webcam plugged into the Pi. Use Raspberry Pi OS with the desktop. The examples use `~/mault`, but you can install in another directory; the service paths are configured automatically.

```bash
git clone https://github.com/maultxyz/mault.git ~/mault
cd ~/mault
scripts/pi/install.sh
```

`install.sh` installs Node 22, pnpm, Postgres with pgvector, ffmpeg, and the webcam tools, then writes `.env` with `AUTH_PROVIDER=local`, `PI_HOST=1`, and a `mault` database on `127.0.0.1:5432`. Run it as the desktop user. It asks for your password when it needs root. If `git` is not installed yet, run `sudo apt install -y git` before the clone. If `.env` already exists and has no `PI_HOST` line, the script appends `PI_HOST=1`. It then creates the `mault` role and database, builds the server and the web app, runs migrations, and enables three user services. Linger is turned on so those services start at boot. It adds the desktop user to the `dialout` group so the API can open the sorter. When this login does not have that group yet, it restarts the user services so the new membership applies.

| Service        | Role                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `mault-api`    | API on `127.0.0.1:3001`, accessible through the web app's `/api` proxy                                     |
| `mault-web`    | Web app on port 8080. Proxies `/api` to the API, including authenticated camera access at `/api/pi-camera` |
| `mault-camera` | `scripts/pi/camera-ctl.py` on `127.0.0.1:8765`. This process owns the USB webcam                           |

Remote browsers use port 8080. The Linux API service binds only to localhost; HTTP and WebSocket requests reach it through the web app's proxy. Other deployments keep the existing API bind address unless `API_HOST` is configured.

Updates are installed manually. Finish any scan, then run these commands on the Pi:

```bash
cd ~/mault
bash scripts/pi/update.sh
```

The updater downloads and builds the latest version of Mault, then restarts the app and camera services. Your settings, accounts, and saved cards stay in place. Any required database updates are applied automatically. When the update finishes, reload Mault in your browsers.

Admins can also choose **Update Mault** in the update banner when a new version is available. Finish scanning, disconnect the sorter, and stop any database sync first. Keep the page open while the update runs, then choose **Refresh** when it reports success. If the app cannot reconnect, check `${XDG_STATE_HOME:-$HOME/.local/state}/mault/update.log` on the Pi.

If you have changed or added files in the installation folder, the updater stops before updating so it does not overwrite your work. If an update fails after stopping the app, resolve the reported error and run the same command again. Check the release instructions for any additional system requirements.

The API service keeps its output in `${XDG_STATE_HOME:-$HOME/.local/state}/mault/api.log`, including scan failures and feed commands. To inspect the latest entries even when the user journal is unavailable:

```bash
tail -n 100 "${XDG_STATE_HOME:-$HOME/.local/state}/mault/api.log"
```

```bash
scripts/pi/start.sh            # start the services and open Chromium on the Pi desktop
scripts/pi/start.sh --kiosk
scripts/pi/stop.sh
```

Open `http://<the-pi>:8080` from another computer to scan. That browser is not on localhost, so while `PI_HOST` is on it uses the Pi's webcam stream and the sorter plugged into the Pi. The scan loop runs in the API: feed, wait the capture settle delay once, take the photo, match, and route. `start.sh` also opens Chromium on the Pi at `http://127.0.0.1:8080`. The camera helper owns the webcam, and the API owns the sorter during a scan. Camera preview and focus control require signing in to an organization.

The API reports a Pi host when `PI_HOST=1`, and also when `/proc/device-tree/model` contains `Raspberry Pi` and `PI_HOST` is unset. `PI_HOST=0` turns the remote-browser behavior off. `WEBCAM_DEVICE` selects a specific `/dev/video*` node when the helper should not pick one itself.

Sign up on the Pi's page. The first account is the platform admin. Add a game in Admin and sync it before scanning. On a Pi host, **Start on this computer** uses the remote computer's browser to vectorize missing card images for the bulk database sync. Keep that admin page open while it works; the cards-at-a-time control sets its concurrency. Live scans still identify cards on the Pi.

If a bin fills or all repack packs are complete, scanning pauses with the current card retained. Empty the relevant bins in the app, then resume. The API reloads rules, capacities, and bin contents before routing that card. Presets with **skip saving** use the existing sort-only path. Stopping a scan may leave a card in the sorter; remove it before starting another session.

### Running pieces individually

```bash
pnpm --filter @magic-vault/server dev
pnpm --filter @magic-vault/web dev
pnpm dev:bot                                   # Discord bot (excluded from pnpm dev)
pnpm --filter @magic-vault/mobile start        # Expo dev server, see packages/mobile/README.md
pnpm build                                     # server (tsup) + web (tsc -b, vite build)
pnpm --filter @magic-vault/web lint
```

There are no automated tests; the web build's `tsc -b` is the type check.

## Database

```bash
pnpm --filter @magic-vault/server db:generate  # migration from schema.ts changes
pnpm --filter @magic-vault/server db:migrate   # apply migrations
pnpm --filter @magic-vault/server db:push      # local iteration only
pnpm --filter @magic-vault/server db:studio
```

These target whatever `DATABASE_URL` points at. Read `CONTRIBUTING.md` before shipping a migration; Drizzle orders migrations by journal timestamp, so check them after merging branches.

## Prices

`node packages/server/dist/scripts/sync-prices.js` pulls TCGplayer (via tcgcsv), Cardmarket and Card Kingdom, downloading only what changed. Nothing runs it automatically.

- **Once a day, never more often.** tcgcsv blocks installs that poll it harder; the TCGplayer step also skips any run within 20 hours of its last pull.
- **No automatic retries.** A failed run waits for the next daily run.
- **First run:** after your first game sync, run it once by hand. Cards have no price until then. `--force` re-downloads everything; use it sparingly.
- Set `CARD_API_USER_AGENT` to a name unique to your install: a source that blocks a name blocks every install using it.

Docker Compose, with `crontab -e` (replace `/opt/mault` with your `docker-compose.yml` folder):

```cron
0 4 * * * cd /opt/mault && docker compose exec -T server sh -c 'if [ "$AUTH_PROVIDER" = local ]; then export DATABASE_URL="${DATABASE_URL:-postgresql://mault:$POSTGRES_PASSWORD@postgres:5432/mault}" DATABASE_SSL="${DATABASE_SSL:-false}"; fi; exec node packages/server/dist/scripts/sync-prices.js' >> /var/log/mault-prices.log 2>&1
```

Coolify: see step 5 under [Coolify](#coolify). Outside Docker: `pnpm --filter @magic-vault/server build`, then schedule the command from the repo root with the `.env` values in its environment.

## Deployment

Four images, built from the repo root and published by CI (`.github/workflows/deploy.yml`) to `ghcr.io/dishwasher-detergent/mault-*`, tagged `vX.Y.Z`, `sha-*` and `:latest` (from `master`) or `:dev`:

| Dockerfile            | Image            | Notes                                            |
| --------------------- | ---------------- | ------------------------------------------------ |
| `Dockerfile.server`   | `mault-server`   | Hono API; also contains the `sync-prices` script |
| `Dockerfile.web`      | `mault-web`      | Vite SPA on nginx, proxies `/api` to the server  |
| `Dockerfile.api-docs` | `mault-api-docs` | Public API reference                             |
| `Dockerfile.bot`      | `mault-bot`      | Optional Discord bot                             |

The images are public, so the web image reads its `VITE_*` settings at container start (`docker/web-env.sh` writes `env.js`). Only `VITE_LATEST_FIRMWARE_VERSION` is a build arg, since it describes the bundled firmware.

The scanner downloads its ONNX weights from `huggingface.co` at runtime (pinned by revision and SHA-256). Allowlist it in DNS blockers such as Pi-hole.

### Docker Compose

```bash
docker compose up --build -d                 # postgres, server, web (:8080), api-docs (:8081)
docker compose --profile bot up --build -d   # + Discord bot (:3002)
```

- For production, set `WEB_URL` to your public origin and use real secrets.
- With `AUTH_PROVIDER=neon`, `.env` must point at a migrated Neon project; the bundled `postgres` then sits unused.
- Prices need the cron job from [Prices](#prices).

### Coolify

`docker-compose-coolify.yml` runs the published images (web, API, pgvector Postgres, optional bot), so nothing builds on your server. `MAULT_IMAGE_TAG` picks the tag (default `latest`; set e.g. `v1.2.3` to pin).

1. **+ New** > **Public Repository** with `https://github.com/dishwasher-detergent/mault`, branch `master`, build pack **Docker Compose** and compose file `/docker-compose-coolify.yml`.
2. Set `WEB_URL` (public origin, no trailing slash) and give `POSTGRES_PASSWORD`, `IMPERSONATION_SECRET`, `OWN_AUTH_TOKEN_PEPPER` and `MONITOR_LINK_SECRET` each its own `openssl rand -hex 32` value. Everything else is optional (see `.env.docker.example`).
3. Route your domain to the **web** service on port 80 (e.g. `https://mault.example.com:80`).
4. Deploy. The API migrates before starting. To update, redeploy: Coolify fetches the latest compose file and pulls the current images.
5. Under **Scheduled Tasks**, add the price sync: command `node packages/server/dist/scripts/sync-prices.js`, container `server`, frequency `0 4 * * *`.

- **Neon:** also set `AUTH_PROVIDER` / `VITE_AUTH_PROVIDER` to `neon`, `DATABASE_SSL=true` and the Neon values, and run the migrations from a checkout before each deploy.
- **Discord:** set `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` and `BOT_API_SECRET` and redeploy; without them the bot idles.
- **Data:** Postgres lives in the `mault-postgres` volume; keep it and back it up. The default `DATABASE_URL` uses `POSTGRES_PASSWORD` unencoded, so keep it URL-safe (hex is). Changing `POSTGRES_PASSWORD` later doesn't change the database's password, and changing `OWN_AUTH_TOKEN_PEPPER` signs everyone out.

### Discord bot

The bot only talks to the server over HTTP (`SERVER_URL`), and the server calls back into the bot's small HTTP server (`BOT_URL`/`BOT_PORT`) to post scan notifications, alerts and rule matches into the channels chosen in Settings > Integrations. Both directions share `BOT_API_SECRET`. Commands are registered globally; set `DISCORD_DEV_GUILD_ID` for faster iteration in development. To give people who link their account with `/link-account` a role in your own server, pick the server and role under Admin > Discord channels (the bot needs Manage Roles and a role above it). Linking and unlinking add and remove the role right away. Someone who links before joining that server gets the role by running `/link-account` again once they're in it. To DM new members of your own server instructions for `/link-account`, set `DISCORD_WELCOME_GUILD_IDS` to its server ID (comma-separate several) and enable the Server Members intent under Bot > Privileged Gateway Intents in the Discord Developer Portal; without the intent the bot can't log in.

## Hardware

Full BOM, wiring and assembly steps are at `/build`. In short:

- **Controller**: Arduino Uno R4 Minima (USB), Uno R4 WiFi (USB + Bluetooth) or ESP32 / ESP32-S3 (USB, Bluetooth and Wi-Fi), driving a PCA9685 over I2C
- **Modules**: 3 positional SG90 servos each (trapdoor, paddle gate, pusher); add modules any time without reflashing, the count is set in Calibration
- **Feeder**: one continuous-rotation servo plus an IR sensor for feed detection
- **Enclosure**: `3d model/` (Fusion 360 / STEP source and printable `.3mf`)

### Firmware

The sketch is `firmware/main/` (`main.ino` plus the BLE and Wi-Fi tabs). The easiest path is flashing from the app, which uses the builds published by `.github/workflows/firmware-release.yml`. To build it yourself, install ArduinoJson, Adafruit PWM Servo Driver and (Uno R4 WiFi) ArduinoBLE, and use the FQBNs from that workflow; ESP32-S3 builds need `USBMode=hwcdc,CDCOnBoot=cdc,FlashMode=dio,PartitionScheme=min_spiffs`.

The firmware has no idea what a bin is: the app resolves each bin to a module and direction (`left`, `right` or `bottom`) and sends newline-delimited JSON at 9600 baud, such as `{"seq":42,"route":{"module":2,"direction":"left"}}`. Note that `"left"` lands on the physical right. `firmware/PROTOCOL.md` documents every command and the USB, BLE and Wi-Fi transports. The PCA9685 channel layout (Standard from channel 0, or Legacy from channel 4 for older wiring) is chosen in Calibration and sent at connect time.

### Raspberry Pi

See [Raspberry Pi](#raspberry-pi). The sorter stays plugged into the Pi, and a USB webcam on the Pi is the scanner camera.

### Wi-Fi remote

ESP32 boards on firmware 2.10.0+ can be driven without a cable. Wi-Fi is configured over USB or Bluetooth, then the board holds a WebSocket to `/sorter-link/device` and the server relays it to one browser. The board dials `SORTER_LINK_URL`, else `API_URL`, else the web origin. In local development set it to a LAN address the board can reach, e.g. `ws://192.168.1.20:3001/sorter-link/device`. The relay is in process, so the board and its browser must reach the same server instance.

### Webcam

A Logitech C920 works well with: auto focus off, focus 50%, auto exposure on, low light compensation on, auto white balance on, brightness 140, contrast 140, saturation 160, sharpness 130.

## Licensing

| Component               | License         |
| ----------------------- | --------------- |
| Software source code    | GPL-3.0         |
| 3D models (`3d model/`) | CC BY-NC-SA 4.0 |

See the `LICENSE` file in each directory for the full terms.
