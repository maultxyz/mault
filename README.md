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
scripts/       Release and version helpers
.github/       Build check, deploy, firmware PR check and firmware release workflows
```

`CLAUDE.md` records the project's conventions and invariants; `CONTRIBUTING.md` covers the dev workflow and database changes.

## Stack

- **Web**: React 19, Vite, React Router v7, Tailwind CSS 4, TanStack Query, React Hook Form + Zod, onnxruntime-web
- **Server**: Hono 4, Drizzle ORM, PostgreSQL with pgvector (Neon or self-hosted), onnxruntime-node, tesseract.js
- **Mobile**: Expo, React Native, onnxruntime-react-native, BLE
- **Auth**: `AUTH_PROVIDER=neon` ([Neon Auth](https://neon.com), JWT via JWKS) or `local` ([own-auth](https://own-auth.com), bearer sessions in your own Postgres)
- **Hardware**: Arduino Uno R4 Minima / R4 WiFi or ESP32(-S3), PCA9685 servo driver, SG90 servos
- **Monorepo**: pnpm workspaces + Turborepo

## Getting started

The app needs Postgres with pgvector and an identity provider. Pick one with `AUTH_PROVIDER` / `VITE_AUTH_PROVIDER`:

- **`neon`** (default): a hosted [Neon](https://neon.com) project. The free tier is enough for a personal deployment.
- **`local`**: fully self-hosted and offline-capable. `docker-compose.yml` runs Postgres, the API, the web app and the API docs; price sync runs from cron (see [Prices](#prices)).

Both read one root `.env` (Vite reads it from the repo root too):

```bash
cp .env.neon.example .env      # Option A: Neon
cp .env.docker.example .env    # Option B: self-hosted
```

Each example lists only the variables that mode uses, with comments for the optional ones (email via Resend, S3 scan image storage, Stripe, Discord, Rollbar, sync tuning).

### Option A: Neon

1. Create a project at [console.neon.tech](https://console.neon.tech) and run `CREATE EXTENSION IF NOT EXISTS vector;` in its SQL editor.
2. Put the pooled connection string in `DATABASE_URL`.
3. Enable **Neon Auth** (Dashboard > Auth) **before** migrating: the RLS policies reference its `authenticated` role and `auth.user_id()`.
4. From the Auth page, set `NEON_AUTH_URL`, `VITE_NEON_AUTH_URL` (same base URL) and `VITE_NEON_DATA_API_URL`.
5. Migrate and run:
   ```bash
   pnpm install
   pnpm --filter @magic-vault/server db:migrate
   pnpm dev        # web :5173, API :3001, API docs :5174
   ```

### Option B: Self-hosted

1. In `.env`, set `POSTGRES_PASSWORD`, `OWN_AUTH_TOKEN_PEPPER` (32+ random bytes) and `IMPERSONATION_SECRET`. Optional: `MONITOR_LINK_SECRET` (shareable monitor links), `API_URL` (public API base for `next_page` links), `SORTER_LINK_URL` (see [Wi-Fi remote](#wi-fi-remote)) and `WEBHOOK_ALLOW_INSECURE_URLS=true` (lets webhooks target `http://` and LAN addresses; keep it off on internet-facing servers).
2. `docker compose up -d`
3. Open `http://localhost:8080` and sign up. The first account becomes platform admin and gets a "Home" organization.
4. In `/app/admin`, add at least one game in the Games Manager and run its sync. Until a game is synced there is nothing to match against.

On every start the `server` container runs Drizzle migrations, own-auth's migrations and `packages/server/src/db/bootstrap-local.sql` (`pnpm db:migrate-local`), all idempotent. Postgres is exposed only on `127.0.0.1:5433` for admin clients.

To make another user a platform admin (there's no UI yet):

```sql
INSERT INTO platform_user_roles (user_id, role) VALUES ('<own_auth_users.id>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

Local mode supports sign-up/sign-in, org switching and invites, API keys and the audit log. Email verification, profile/password editing, multi-session management and social sign-in are Neon-only.

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

`packages/server/scripts/sync-prices.ts` pulls TCGplayer (via tcgcsv), Cardmarket and Card Kingdom, downloading only what changed upstream. Nothing runs it automatically: schedule it with cron (or any scheduler) on the host. It's built into the server image, so with Docker Compose run it inside the `server` container. Add this with `crontab -e`, replacing `/opt/mault` with the folder holding `docker-compose.yml`:

```cron
0 */6 * * * cd /opt/mault && docker compose exec -T server sh -c 'if [ "$AUTH_PROVIDER" = local ]; then export DATABASE_URL="${DATABASE_URL:-postgresql://mault:$POSTGRES_PASSWORD@postgres:5432/mault}" DATABASE_SSL="${DATABASE_SSL:-false}"; fi; exec node packages/server/dist/scripts/sync-prices.js' >> /var/log/mault-prices.log 2>&1
```

The `sh -c` wrapper points local mode at the stack's own Postgres, the same way the server's start-up command does. Every six hours is enough: runs that find nothing new upstream download nothing, and a failed run is simply retried by the next one. Outside Docker, run `pnpm --filter @magic-vault/server build` once and schedule `node packages/server/dist/scripts/sync-prices.js` from the repo root with the same `.env` values in its environment.

tcgcsv publishes once a day and blocks clients that poll it harder, so the TCGplayer step makes no requests at all within 20 hours of its last successful pull, then checks `last-updated.txt` before downloading anything, one request per second. Set `CARD_API_USER_AGENT` to your own install's name: every card and price source sees it, and a source that blocks an agent blocks every install sharing it. Use `--force` sparingly: it downloads every category again.

Prices attach to synced cards, so cards show no price until their game has synced and the first pull has finished. After the first game sync, run the cron command once by hand (append `--force` after `sync-prices.js` for a full pull) instead of waiting for the schedule, and check `/var/log/mault-prices.log` for later runs.

## Deployment

Four images, built from the repo root:

| Dockerfile | Image | Notes |
| --- | --- | --- |
| `Dockerfile.server` | `mault-server` | Hono API; also contains the `sync-prices` script |
| `Dockerfile.web` | `mault-web` | Vite SPA on nginx, proxies `/api` to the server |
| `Dockerfile.api-docs` | `mault-api-docs` | Public API reference |
| `Dockerfile.bot` | `mault-bot` | Optional Discord bot |

CI (`.github/workflows/deploy.yml`) publishes them to GHCR as `ghcr.io/dishwasher-detergent/mault-*`, tagged `vX.Y.Z`, `sha-*` and `:latest` (from `master`) or `:dev`. Because the images are public, the web image's `VITE_*` settings are read at container start (`docker/web-env.sh` writes `env.js`), so one image works for any deployment. Only `VITE_LATEST_FIRMWARE_VERSION` is a build arg, since it describes the firmware baked into the image.

The scanner's ONNX weights are pinned by Hugging Face revision and SHA-256 and downloaded at runtime. DNS blockers such as Pi-hole may block `huggingface.co`; allowlist it if model downloads fail.

### Docker Compose

`docker-compose.yml` works for both providers:

```bash
docker compose up --build -d                 # postgres, server, web (:8080), api-docs (:8081)
docker compose --profile bot up --build -d   # + Discord bot (:3002)
```

For production, set `WEB_URL` to your public origin and use real secrets. With `AUTH_PROVIDER=neon`, `.env` must point at a migrated Neon project; the bundled `postgres` service then sits unused. Inside compose the server and bot reach each other by service name, so `.env`'s localhost `SERVER_URL`/`BOT_URL` are overridden. Prices need the cron job from [Prices](#prices).

### Coolify

`docker-compose-coolify.yml` is a self-contained local-auth stack (web, API, pgvector Postgres, price sync, optional bot).

1. **+ New** > Public Repository (or a Git integration), build pack **Docker Compose**, base directory `/`, compose file `/docker-compose-coolify.yml`.
2. Set the environment:

   | Variable | Value |
   | --- | --- |
   | `AUTH_PROVIDER` / `VITE_AUTH_PROVIDER` | `local` |
   | `VITE_APP_ENV` | `local` |
   | `WEB_URL` | Public origin, e.g. `https://mault.example.com`, no trailing slash |
   | `POSTGRES_PASSWORD` | Strong password |
   | `IMPERSONATION_SECRET`, `OWN_AUTH_TOKEN_PEPPER` | Separate random secrets (`openssl rand -hex 32`) |

   Leave `VITE_API_URL` and the Neon variables empty. Everything else is optional (see `.env.docker.example`).
3. Route your domain to the **web** service on port 80 (e.g. `https://mault.example.com:80`; the suffix only picks the container port).
4. Deploy. The API migrates before starting and the other services wait for it to be healthy.

For Discord, set `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` and `BOT_API_SECRET` and redeploy; without them the bot container idles.

Postgres lives in the `mault-postgres` volume: keep it across updates and back it up. Changing `POSTGRES_PASSWORD` later doesn't change the existing role's password, and changing `OWN_AUTH_TOKEN_PEPPER` signs everyone out.

### Discord bot

The bot only talks to the server over HTTP (`SERVER_URL`), and the server calls back into the bot's small HTTP server (`BOT_URL`/`BOT_PORT`) to post scan notifications, alerts and rule matches into the channels chosen in Settings > Integrations. Both directions share `BOT_API_SECRET`. Commands are registered globally; set `DISCORD_DEV_GUILD_ID` for faster iteration in development.

## Hardware

Full BOM, wiring and assembly steps are at `/build`. In short:

- **Controller**: Arduino Uno R4 Minima (USB), Uno R4 WiFi (USB + Bluetooth) or ESP32 / ESP32-S3 (USB, Bluetooth and Wi-Fi), driving a PCA9685 over I2C
- **Modules**: 3 positional SG90 servos each (trapdoor, paddle gate, pusher); add modules any time without reflashing, the count is set in Calibration
- **Feeder**: one continuous-rotation servo plus an IR sensor for feed detection
- **Enclosure**: `3d model/` (Fusion 360 / STEP source and printable `.3mf`)

### Firmware

The sketch is `firmware/main/` (`main.ino` plus the BLE and Wi-Fi tabs). The easiest path is flashing from the app, which uses the builds published by `.github/workflows/firmware-release.yml`. To build it yourself, install ArduinoJson, Adafruit PWM Servo Driver and (Uno R4 WiFi) ArduinoBLE, and use the FQBNs from that workflow; ESP32-S3 builds need `USBMode=hwcdc,CDCOnBoot=cdc,FlashMode=dio,PartitionScheme=min_spiffs`.

The firmware has no idea what a bin is: the app resolves each bin to a module and direction (`left`, `right` or `bottom`) and sends newline-delimited JSON at 9600 baud, such as `{"seq":42,"route":{"module":2,"direction":"left"}}`. Note that `"left"` lands on the physical right. `firmware/PROTOCOL.md` documents every command and the USB, BLE and Wi-Fi transports. The PCA9685 channel layout (Standard from channel 0, or Legacy from channel 4 for older wiring) is chosen in Calibration and sent at connect time.

### Wi-Fi remote

ESP32 boards on firmware 2.10.0+ can be driven without a cable. Wi-Fi is configured over USB or Bluetooth, then the board holds a WebSocket to `/sorter-link/device` and the server relays it to one browser. The board dials `SORTER_LINK_URL`, else `API_URL`, else the web origin. In local development set it to a LAN address the board can reach, e.g. `ws://192.168.1.20:3001/sorter-link/device`. The relay is in process, so the board and its browser must reach the same server instance.

### Webcam

A Logitech C920 works well with: auto focus off, focus 50%, auto exposure on, low light compensation on, auto white balance on, brightness 140, contrast 140, saturation 160, sharpness 130.

## Licensing

| Component | License |
| --- | --- |
| Software source code | MIT |
| 3D models (`3d model/`) | CC BY-NC-SA 4.0 |

See the `LICENSE` file in each directory for the full terms.
