# Mault

An open-source trading card scanner and physical sorter. A camera identifies each card with on-device image embeddings, a rule engine picks its bin, and a feeder plus servo modules driven by an Arduino or ESP32 drop it there. Collections, storage boxes, prices, stats and integrations live in the same app.

- Hosted app: [mault.xyz](https://mault.xyz)
- Printable sorter: [MakerWorld](https://makerworld.com/en/models/3066180-tcg-card-sorting-machine)
- Build guide (BOM, wiring, assembly): `/build` in the app

## Supported games

Magic: The Gathering, Pokemon, Yu-Gi-Oh, One Piece, Lorcana, Gundam, Flesh and Blood, Riftbound, Grand Archive, Star Wars: Unlimited, Cyberpunk, Sorcery: Contested Realm.

Each game is a pluggable adapter (`packages/server/src/lib/adapters/<game>/`) plus a `Game` row in the admin Games Manager, whose field definitions drive rules, sorting, filters and notifications for that game.

## How it works

1. The feeder pushes a card from the hopper into the camera's calibrated scan region and waits for it to settle at the IR sensor.
2. The client finds the card's four corners, dewarps it and embeds it with [CollectorVision](https://github.com/HanClinto/CollectorVision)'s corner detector and Milo embedder (ONNX, in the browser or on the phone). If the client can't run the models, the server embeds the image instead.
3. The server finds the closest cards by comparing the embedding against its in-memory index of every card vector (stored in Postgres with pgvector). When printings look alike, OCR of the name, set and number breaks the tie; weak matches are flagged for review.
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
- **`local`**: fully self-hosted. `docker-compose.yml` runs Postgres, the API, the web app and the API docs. A Raspberry Pi can host the same local-auth app from a prebuilt SD image or release bundle ([Raspberry Pi](#Raspberry-Pi-and-Orange-Pi-Zero-4)).

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

1. In `.env`, set `POSTGRES_PASSWORD`, `OWN_AUTH_TOKEN_PEPPER`, `IMPERSONATION_SECRET`, and `MONITOR_LINK_SECRET` (`openssl rand -hex 32` each).
2. `docker compose up -d`, then open `http://localhost:8080` and sign up. The first account becomes platform admin with a "Home" organization.
3. In `/app/admin`, add a game in the Games Manager and sync it. Scans can't match until one has synced.

The `server` container runs every migration and `packages/server/src/db/bootstrap-local.sql` on start (`pnpm db:migrate-local`, idempotent). Postgres listens only on `127.0.0.1:5433`. Email verification, profile/password editing, multi-session management and social sign-in are Neon-only.

Optional: `API_URL` (public API base for `next_page` links), `SORTER_LINK_URL` (see [Wi-Fi remote](#wi-fi-remote)), `WEBHOOK_ALLOW_INSECURE_URLS=true` (webhooks to `http://` and LAN addresses; keep it off on public servers).

To make another user platform admin (no UI yet):

```sql
INSERT INTO platform_user_roles (user_id, role) VALUES ('<own_auth_users.id>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Raspberry Pi and Orange Pi Zero 4

A Raspberry Pi or Orange Pi Zero 4 can host the local-auth app and run the sorter headlessly. Nothing is cloned or built on the board: it runs a prebuilt release built by `.github/workflows/pi-release.yml`. Like the firmware and mobile releases, it is dispatched by hand: from master it publishes `pi-v<app version>` (bundle, SD image and installer) and points the `pi-latest` release's `manifest.json` and `install.sh` at it; from dev it publishes `<version>-dev.<run>` to the moving `pi-dev` pre-release, which dev installs update from. The bundle holds its own Node, the built API with its runtime dependencies, the Pi-mode web build and the Pi helpers. The scanner camera is a USB webcam plugged into the board, owned by `mault-camera.service`. Phone and computer browsers use the authenticated camera relay; they do not need browser permission to access that webcam.

**Raspberry Pi 4 or 5:** download `mault-pi.img.xz` from the newest `pi-v*` release and flash it with Raspberry Pi Imager. Set a username (anything except `mault-service`), password, Wi-Fi and SSH in Imager's OS customisation; Ethernet works without it. On first boot, `mault-setup.service` writes secrets, creates the database and starts Mault. Then open `http://mault.local` (or the board's IP address) from any browser on the network.

**Other arm64 boards, or an existing Raspberry Pi OS install:**

```bash
curl -fsSL https://github.com/<owner>/<repo>/releases/download/pi-latest/install.sh | sudo bash
```

`install.sh` installs Postgres with pgvector, nginx, ffmpeg, the webcam tools, BlueZ and Bleak, creates the `mault-service` account, unpacks the release into `/opt/mault/releases/<version>` (`/opt/mault/current` points at the running one), and runs `scripts/pi/setup.sh`. Setup writes `/var/lib/mault/.env` with `AUTH_PROVIDER=local`, `PI_HOST=1`, a generated `CARD_API_USER_AGENT` and new secrets, creates the `mault` role and database, and enables the user services under `mault-service` with linger so they start at boot. Reruns keep the saved settings. `sudo bash install.sh --bundle mault-pi-arm64.tar.gz` installs a downloaded bundle offline.

The hardware choice is `PI_SORTER=1` (the board drives the sorter through GPIO/I2C) or `PI_SORTER=0` (an Arduino/ESP32 over USB or Bluetooth). The SD image picks it on first boot: `PI_SORTER=1` when a PCA9685 answers on I2C bus 1 (the image enables I2C), else `PI_SORTER=0`. The curl installer asks, or reads `PI_SORTER` and `PI_SORTER_BOARD` from the environment (`PI_SORTER=1 PI_SORTER_BOARD=orange-pi-zero4`). Change it later with `sudo mault sorter usb` or `sudo mault sorter builtin [raspberry-pi|orange-pi-zero4]`.

A board that still has a `~/mault` checkout from the old git-based installer is migrated when the installer runs with `sudo` from that user: `.env`, calibration, pending scan saves and downloaded models are copied into `/var/lib/mault`, the database is reused, and the old user services are disabled. Delete the old checkout once Mault is running.

Orange Pi Zero 4 direct mode requires a supported Zero 4 system image and the libgpiod v2 Python API (`python3-libgpiod`); setup installs and checks that API. Enable the image's `i2c0` boot overlay separately and reboot so the header TWI0 adapter is available. GPIO and I2C devices are discovered by their hardware paths.

In direct mode the Pi itself is the sorter. The API sends commands to the local controller process, which operates the PCA9685 and sensors through GPIO/I2C. Direct mode uses a single built-in sorter; additional USB, Bluetooth and Wi-Fi sorter stations are unavailable in this mode. The web app automatically attaches its built-in sorter controls through authenticated `/pi-sorter` access without an automatic mechanical test. Multiple browsers share the server's controller connection; commands and replies are coordinated centrally. A scan reserves hardware-changing commands, and competing motion or configuration commands return busy. Viewing the app from another device does not take control away. Calibration is stored in `/var/lib/mault/.pi-controller/calibration.json`; setup writes absolute `PI_CONTROLLER_CONFIG` and `PI_CONTROLLER_SOCKET` paths into `.env`. The Python controller uses the existing serial command protocol and updates with the app; it does not require firmware flashing. Native mobile connections remain BLE or Wi-Fi relay connections.

Linux and Pi installations with external sorters use `PI_HOST=1` with `PI_SORTER=0`; USB and host Bluetooth connections do not require GPIO control. Use the sorter menu to connect an attached USB sorter as another station, then choose its camera from the camera menu. Each station keeps its own device calibration, collection and camera preference, just as it does with browser-connected hardware. USB sorters can stay connected while you switch station tabs. Identical cameras are distinguished by their Linux device IDs; stable USB by-id paths are used when available. The helper keeps each camera's stream, frame buffer and focus settings separate.

Headless scanning runs one session per organization. Stop that session before switching its hardware pair; starting the next scan passes the station's selected controller and camera to the API, which continues using that pair if the browser closes. A missing selected device produces an error instead of selecting another sorter or camera. Native mobile sorter connections remain BLE and Wi-Fi; Pi hardware selection is available in desktop and mobile browsers.

| Service            | Role                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `nginx` (system)   | Serves the web app on ports 80 and 8080 and proxies `/api` to the API, including `/api/pi-camera`      |
| `mault-api`        | API on `127.0.0.1:3001`; runs migrations on start                                                     |
| `mault-camera`     | `scripts/pi/camera-ctl.py` on `127.0.0.1:8765`. This process owns the USB webcam                       |
| `mault-controller` | Direct mode only: local Python GPIO/I2C controller, started and stopped with the API                   |
| `mault-prices`     | Daily price sync at 04:00 (timer)                                                                      |

The `mault-*` units are systemd user services of `mault-service`. The API binds only to localhost; HTTP and WebSocket requests reach it through nginx. Other deployments keep the existing API bind address unless `API_HOST` is configured. The web app in the bundle runs in Pi mode (`VITE_PI_HOST=true` in its `env.js`): `/` goes straight to sign-in and the marketing and legal pages are left out.

Everything on the board goes through the `mault` command:

```bash
sudo mault status            # version and service state
sudo mault update            # install the latest release
sudo mault logs [api|camera|controller|update|setup]
sudo mault start | stop | restart
sudo mault prices            # pull prices now
sudo mault urls              # addresses to open
```

Admins can also update from the app's update banner (**Update Mault**), which runs `scripts/pi/run-update.sh` as a separate user job. The updater runs as `mault-service` and needs no sudo password: it downloads the bundle named in the manifest its `release.json` points at (`pi-latest` or `pi-dev`), checks its SHA-256, unpacks it next to the running release, stops the services, switches `/opt/mault/current`, re-renders the units and starts them. If the new version does not answer, it switches back to the previous release. It keeps the running and previous releases. Finish scanning, disconnect the sorter and stop any database sync first; the API refuses browser updates otherwise. Settings, accounts and saved cards stay in place, and database migrations run when the API starts.

The API log is at `/var/lib/mault/.local/state/mault/api.log` (`sudo mault logs`), including scan failures and feed commands.

Open `http://mault.local` (or port 8080) from another computer to scan. That browser is not on localhost, so while `PI_HOST` is on it uses the Pi's webcam stream and the sorter plugged into the Pi. The scan loop runs in the API: feed, wait the capture settle delay once, take the photo, match, and route. The camera helper owns the webcam, and the API owns the sorter during a scan. Camera preview and focus control require signing in to an organization.

The API reports a Pi host when `PI_HOST=1`, and also when `/proc/device-tree/model` contains `Raspberry Pi` and `PI_HOST` is unset. `PI_HOST=0` turns the remote-browser behavior off. `WEBCAM_DEVICE` selects a specific `/dev/video*` node when the helper should not pick one itself.

Sign up on the Pi's page. The first account is the platform admin. Add a game in Admin and sync it before scanning. On a Pi host, **Start on this computer** uses the remote computer's browser to vectorize missing card images for the bulk database sync. Keep that admin page open while it works; the cards-at-a-time control sets its concurrency. Live scans still identify cards on the Pi.

If a bin fills or all repack packs are complete, scanning pauses with the current card retained. Empty the relevant bins in the app, then resume. The API reloads rules, capacities, and bin contents before routing that card. Presets with **skip saving** use the existing sort-only path. Stopping a scan may leave a card in the sorter; remove it before starting another session.

On Linux/Pi hosts with `PI_SORTER=0`, the connection menu offers Bluetooth when BlueZ and the system Python Bleak package are installed and an adapter is present. A powered-off adapter shows a disabled status; enable it with the host's Bluetooth settings. Open Connect Bluetooth to search for nearby sorters advertising the Nordic UART BLE service, then select the sorter. Discovery is on demand, never continuous. The API owns the Bluetooth connection, so this works from remote browsers (including Firefox) and headless scans. USB and Bluetooth connections use the same per-device ownership checks; a missing or disconnected Bluetooth sorter never falls back to another device. Keep the ESP32 nearby and advertising, and disconnect other clients before connecting. Available simultaneous connections depend on the adapter. GPIO mode remains a single built-in sorter and does not expose Bluetooth.

The installer always installs `bluez` and `python3-bleak` and enables the Bluetooth service; the helper uses `/usr/bin/python3`. The default BlueZ adapter must support BLE. Ordinary non-host browser Bluetooth still uses Web Bluetooth and the browser computer's adapter, with its browser/platform requirements; native mobile BLE remains unchanged.

To build a bundle yourself, run `scripts/pi/build-bundle.sh --version <x.y.z> --manifest-url <url> --out <dir>` on linux-arm64 with the Dockerfiles' Node and pnpm.

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

`node packages/server/dist/scripts/sync-prices.js` pulls TCGplayer prices and SKU ids for the TCGplayer CSV export (via TCGTracking), Cardmarket and Card Kingdom, downloading only what changed. Nothing runs it automatically.

- **Once a day is enough.** TCGplayer prices only re-download sets TCGTracking reports as changed, and the Card Kingdom step skips any run within 20 hours of its last pull.
- **No automatic retries.** A failed run waits for the next daily run.
- **First run:** after your first game sync, run it once by hand. Cards have no price until then. `--force` re-downloads everything; use it sparingly.
- **Only some games:** `--games=mtg` (comma-separated game keys) limits every source and the price refresh to those games; Card Kingdom only runs when a listed game uses it.
- Set `CARD_API_USER_AGENT` to a name unique to your install: a source that blocks a name blocks every install using it.

Docker Compose, with `crontab -e` (replace `/opt/mault` with your `docker-compose.yml` folder):

```cron
0 4 * * * cd /opt/mault && docker compose exec -T server sh -c 'if [ "$AUTH_PROVIDER" = local ]; then export DATABASE_URL="${DATABASE_URL:-postgresql://mault:$POSTGRES_PASSWORD@postgres:5432/mault}" DATABASE_SSL="${DATABASE_SSL:-false}"; fi; exec node packages/server/dist/scripts/sync-prices.js' >> /var/log/mault-prices.log 2>&1
```

Coolify: see step 5 under [Coolify](#coolify). Outside Docker: `pnpm --filter @magic-vault/server build`, then schedule the command from the repo root with the `.env` values in its environment.

## Card catalogs

`pnpm --filter @magic-vault/server sync:catalogs` runs the card sync (the same worker the admin page starts) in its own process against `DATABASE_URL`, one game and language after another, so the server does none of the work. `--games=mtg,pokemon` and `--languages=en` limit it, `--force` force-resyncs. A running server picks the new cards up within a minute.

`.github/workflows/card-catalog-sync.yml` runs it nightly on a GitHub runner. It needs the `DATABASE_URL` secret in the `production` environment and, optionally, a `CARD_API_USER_AGENT` variable. Run it by hand to limit it to some games or languages.

## Deployment

Five images, built from the repo root and published by CI (`.github/workflows/deploy.yml`) to `ghcr.io/maultxyz/mault-*`, tagged `vX.Y.Z`, `sha-*` and `:latest` (from `master`) or `:dev`:

| Dockerfile            | Image            | Notes                                            |
| --------------------- | ---------------- | ------------------------------------------------ |
| `Dockerfile.server`   | `mault-server`   | Hono API; also contains the `sync-prices` script |
| `Dockerfile.web`      | `mault-web`      | Vite SPA on nginx, proxies `/api` to the server  |
| `Dockerfile.api-docs` | `mault-api-docs` | Public API reference                             |
| `Dockerfile.bot`      | `mault-bot`      | Optional Discord bot                             |
| `Dockerfile.shortener` | `mault-shortener` | Optional link shortener                         |

The images are public, so the web image reads its `VITE_*` settings at container start (`docker/web-env.sh` writes `env.js`). The server reports the bundled firmware's version from `FIRMWARE_VERSION` in `firmware/main/main.ino`, which the server image copies.

The scanner downloads its ONNX weights from `huggingface.co` at runtime (pinned by revision and SHA-256). Allowlist it in DNS blockers such as Pi-hole.

### Docker Compose

```bash
docker compose up --build -d                 # postgres, server, web (:8080), api-docs (:8081)
docker compose --profile shortener up --build -d   # + link shortener (:8082)
docker compose --profile bot up --build -d   # + Discord bot (internal :3002)
```

- For production, set `WEB_URL` to your public origin and use real secrets.
- With `AUTH_PROVIDER=neon`, `.env` must point at a migrated Neon project; the bundled `postgres` then sits unused.
- Prices need the cron job from [Prices](#prices).

### Link shortener

Short links are optional. Without them, share links and shop catalogs are shared as their full tokenized URLs. To share `https://<short domain>/<code>` instead, run the standalone shortener (`packages/shortener`, image `mault-shortener`) on its own domain:

1. Route the short domain to the shortener on port 3003 and set its `SHORT_LINK_TARGET_ORIGIN` to the web origin. It keeps its table in the database's `shortener` schema, created on start.
2. On the API, set `SHORT_LINK_BASE_URL` (the short domain), `SHORTENER_URL` (how the API reaches the shortener internally) and `SHORTENER_API_SECRET` (also given to the shortener).

The API then registers each link's code with the shortener and re-registers every live link when it starts, so links created while short links were off also get short URLs. Unknown codes redirect to the web app's `/link-not-found`. Platform admins can also create custom links on the short domain (for example `/discord` to an invite) under Admin > Short links. Mobile builds need `MOBILE_SHORT_LINK_URL` set to the same domain to read those QR codes.

### Coolify

`docker-compose-coolify.yml` runs the published images (web, API, pgvector Postgres, optional bot and link shortener), so nothing builds on your server. `MAULT_IMAGE_TAG` picks the tag (default `latest`; set e.g. `v1.2.3` to pin).

1. **+ New** > **Public Repository** with `https://github.com/maultxyz/mault`, branch `master`, build pack **Docker Compose** and compose file `/docker-compose-coolify.yml`.
2. Set `WEB_URL` (public origin, no trailing slash) and give `POSTGRES_PASSWORD`, `IMPERSONATION_SECRET`, `OWN_AUTH_TOKEN_PEPPER`, and `MONITOR_LINK_SECRET` each its own `openssl rand -hex 32` value. Everything else is optional (see `.env.docker.example`).
3. Route your domain to the **web** service on port 80 (e.g. `https://mault.example.com:80`).
4. Deploy. The API migrates before starting. To update, redeploy: Coolify fetches the latest compose file and pulls the current images.
5. Under **Scheduled Tasks**, add the price sync: command `node packages/server/dist/scripts/sync-prices.js`, container `server`, frequency `0 4 * * *`.

- **Neon:** also set `AUTH_PROVIDER` / `VITE_AUTH_PROVIDER` to `neon`, `DATABASE_SSL=true` and the Neon values, and run the migrations from a checkout before each deploy.
- **Short links:** route a short domain to the **shortener** service on port 3003 and set `SHORT_LINK_BASE_URL`, `SHORT_LINK_TARGET_ORIGIN` and `SHORTENER_API_SECRET` (see [Link shortener](#link-shortener)); without them the shortener idles.
- **Discord:** set `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` and `BOT_API_SECRET` and redeploy; without them the bot idles.
- **Data:** Postgres lives in the `mault-postgres` volume; keep it and back it up. The default `DATABASE_URL` uses `POSTGRES_PASSWORD` unencoded, so keep it URL-safe (hex is). Changing `POSTGRES_PASSWORD` later doesn't change the database's password, and changing `OWN_AUTH_TOKEN_PEPPER` signs everyone out.

### Monitoring (Better Stack)

Error tracking and uptime monitoring are optional and use [Better Stack](https://betterstack.com).

- **Errors:** set `BETTER_STACK_ERRORS_DSN` (API) and `VITE_BETTER_STACK_ERRORS_DSN` (web) to the Sentry-compatible DSN of a Better Stack Errors application. Only exceptions are sent.
- **Uptime:** create an Uptime API token, then run `pnpm uptime:sync` with the public URLs of the deployment (it refuses `localhost`). It creates or updates, by name, HTTP monitors for the web app, the API's `/api/public/version`, and the link shortener and API docs when `SHORT_LINK_BASE_URL` and `VITE_API_DOCS_URL` are set. It also creates heartbeats for services Better Stack can't reach from outside and prints each heartbeat URL:
  - **Discord bot:** set `BETTER_STACK_BOT_HEARTBEAT_URL` on the bot; it pings every minute while connected to Discord.
  - **Price sync and card catalog sync** (production only): set `BETTER_STACK_PRICE_SYNC_HEARTBEAT_URL` and `BETTER_STACK_CATALOG_SYNC_HEARTBEAT_URL` as secrets in the GitHub `production` environment. Scheduled runs ping on success and report `/fail` on failure.

```bash
BETTER_STACK_UPTIME_API_TOKEN=... WEB_URL=https://mault.example.com \
  SHORT_LINK_BASE_URL=https://mlt.example VITE_API_DOCS_URL=https://docs.mault.example.com \
  pnpm uptime:sync                       # add -- --environment=dev for a dev deployment
```

Rerun it whenever a URL changes. Values in your shell take precedence over `.env`. No monitor or heartbeat touches the database, so none of them keeps Neon awake: the API monitor checks only that the process answers, and database failures surface through error tracking when real requests hit them.

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

See [Raspberry Pi](#Raspberry-Pi-and-Orange-Pi-Zero-4). The sorter stays plugged into the Pi, and a USB webcam on the Pi is the scanner camera.

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
