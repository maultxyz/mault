# Magic Vault

A TCG card scanner and physical sorter. A webcam identifies cards via AI image embeddings, a rule engine decides which bin each card belongs in, and a feeder and servo mechanism driven by an Arduino or ESP32 physically routes the card there.

## MakerWorld

https://makerworld.com/en/models/3066180-tcg-card-sorting-machine#profileId-3451252

## How it works

1. A feeder mechanism (continuous-rotation servo + roller) pulls a card from the hopper into view of the webcam, into a fixed, per-camera-calibrated scan region (see calibration screen)
2. The browser crops that region to a straightened card image (plain Canvas 2D, no computer vision needed, since the camera mounting and card size are fixed and calibrated ahead of time)
3. The image is sent to the server for embedding search (Hugging Face SigLIP)
4. PostgreSQL vector similarity search (pgvector) identifies the card
5. Configurable, per-collection bin rules decide which bin the card should go to
6. The web app sends a serial command to the microcontroller, which drives the trapdoor/paddle/pusher servos to route the card into that bin

## Features

- Live webcam scanning with automatic card detection and identification; captures wait for the card to physically settle at the sensor before the shot is taken
- Multi-TCG support: pluggable card-search adapters per game (Scryfall/MTG built in, plus Gundam Card Game), with each game's own admin-configurable field definitions driving sorting, filtering, and bin rules
- Rule-based sort bins, grouped by collection, with and/or rule trees across each game's own card fields (color, rarity, price, set, etc.)
- Card grid sorting (by name, price, rarity, etc.) adapts automatically to whichever game a collection uses
- Multiple collections per organization, each with their own bin configuration and card history
- Remote monitoring: watch an in-progress scan session live from another device
- Discord bot: link a Discord server to an organization from Settings, then anyone in it can run `/stats` (optionally scoped to one collection via autocomplete) to check collection stats. `/notify-channel` and `/scan-channel` independently pick where error/status alerts (sorter errors, jams, sync failures) and card-scan messages get posted — no webhook URLs to configure
- Per-organization branding and scanner layout settings
- Feeder, servo, and camera scan-region calibration tools: the camera's capture region can be dragged/resized live against the feed to match different webcam mountings and fields of view
- In-app hardware build guide (`/build`) with bill of materials, wiring diagrams, and assembly instructions

## Stack

- **Web**: React 19, Vite, React Router v7, Tailwind CSS 4, TanStack Query
- **Server**: Hono 4, Drizzle ORM, Neon PostgreSQL (pgvector)
- **Auth**: Neon Auth (JWT), backed by Better Auth on the client
- **Hardware**: Arduino Uno R4 or ESP32 via Web Serial API (9600 baud), PCA9685 servo driver
- **Monorepo**: Turborepo + pnpm workspaces

## Project structure

```
packages/
├── shared/   @magic-vault/shared - types, constants, evaluate-bin rule engine
├── server/   @magic-vault/server - Hono API, Drizzle schema/db, auth middleware
├── web/      @magic-vault/web    - React SPA (scanner, bins, collections, admin, build guide)
└── bot/      @magic-vault/bot    - Discord bot (slash commands), talks to the server's HTTP API only
firmware/     Arduino/ESP32 sketch (firmware/main/main.ino)
"3d model"/   Printable enclosure/module design (Fusion 360 + .3mf)
drizzle/      Generated SQL migrations
scripts/      Release/version-bump helpers
```

## Getting started

```bash
pnpm install
pnpm dev        # Vite on :5173, Hono on :3001
```

### Setting up Neon

The app needs a Postgres database with pgvector (for card-embedding search) and an identity provider (for login + row-level security). By default that's a [Neon](https://neon.com) project (Neon Auth), described below. If you'd rather run entirely offline with no external account, see [Fully self-hosted](#fully-self-hosted-no-neon-account-works-offline) instead. Neon's free tier is enough for a personal/single-org deployment if you go that route.

1. Create a Neon project at [console.neon.tech](https://console.neon.tech) (any recent Postgres version works; pgvector ships as a bundled extension).
2. Open the SQL editor on your project's default branch/database and enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy the pooled connection string (Dashboard → Connect) into `DATABASE_URL`.
4. Enable **Neon Auth** for the project (Dashboard → Auth). This provisions the `auth` schema, the `authenticated` Postgres role, and `auth.user_id()` — the row-level-security policies in `drizzle/*.sql` reference these directly, so Auth must be enabled _before_ you run migrations or `db:push` (step below), or they'll fail with an undefined function/role error.
5. From the Auth page, grab:
   - `NEON_AUTH_URL` — the base Auth URL (the server derives the JWKS endpoint and JWT issuer from it: `${NEON_AUTH_URL}/.well-known/jwks.json`)
   - `VITE_NEON_AUTH_URL` — same Auth base URL, used client-side by the Better Auth React client
   - `VITE_NEON_DATA_API_URL` — the project's Data API URL, also from the Auth page
6. Run `pnpm --filter @magic-vault/server db:push` (or `db:generate` + `db:migrate`, see [Database](#database)) to create the schema and RLS policies against your new database.

### Environment variables

Everything lives in a single root `.env` (Vite is configured to read up from `packages/web`, so there's no separate `packages/web/.env`). Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

```
WEB_URL=http://localhost:5173
PORT=3001

# Get from neon.com
DATABASE_URL=
NEON_AUTH_URL=
VITE_NEON_DATA_API_URL=
VITE_NEON_AUTH_URL=

# Generate yourself (any random string) - signs the server's short-lived
# admin impersonation tokens
IMPERSONATION_SECRET=

# Optional - tuning for the admin card-image-vector sync job
VECTORIZE_CONCURRENCY=1
SYNC_INSERT_BATCH_SIZE=50
SCAN_VECTORIZE_CONCURRENCY=2

# Discord bot (packages/bot) - optional, only needed if you're running it.
# Bot token/client id come from the Discord Developer Portal; BOT_API_SECRET
# is any random string shared between the server and bot processes.
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
BOT_API_SECRET=
SERVER_URL=http://localhost:3001
DISCORD_DEV_GUILD_ID=
BOT_PORT=3002
BOT_URL=http://localhost:3002

# Public variables for the React app
VITE_API_URL=http://localhost:3001
VITE_APP_ENV=local
VITE_LATEST_FIRMWARE_VERSION=1.0.1 # Must match the latest release in main.ino
```

## Database

```bash
pnpm --filter @magic-vault/server db:generate  # generate a migration from schema changes
pnpm --filter @magic-vault/server db:migrate   # apply migrations
pnpm --filter @magic-vault/server db:push      # push schema directly (dev)
pnpm --filter @magic-vault/server db:studio    # open Drizzle Studio
```

## Deployment

`Dockerfile.server` builds the Hono API (and pre-downloads the SigLIP model at build time). `Dockerfile.web` builds the Vite SPA and serves it with nginx (`nginx.conf`); `VITE_API_URL` (and, for self-hosted auth, `VITE_AUTH_PROVIDER`) must be supplied as build args since they're baked into the client bundle. `Dockerfile.bot` builds the optional Discord bot — it talks to the server over HTTP (`SERVER_URL`), never the database directly, but the connection is bidirectional: the server also calls back into the bot's own small HTTP server (`BOT_PORT`, exposed to the server as `BOT_URL`) to post every notification into whichever channel was set with `/notify-channel` (errors, jams, sync failures) or `/scan-channel` (card scans). Both directions share `BOT_API_SECRET`.

### Fully self-hosted (no Neon account, works offline)

`docker-compose.yml` runs the whole stack — Postgres+pgvector, the API, and the web app — with `AUTH_PROVIDER=local`: [own-auth](https://own-auth.com) handles sign-up/sign-in against the same self-hosted Postgres, no external account or internet connection required at runtime.

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, OWN_AUTH_TOKEN_PEPPER (32+ random bytes),
# and IMPERSONATION_SECRET

docker compose up -d
```

Open `http://localhost:8080` and sign up. The first account ever created on a fresh instance is automatically made platform admin (Games Manager, sync job, impersonation) and gets a default "Home" organisation — from there, add at least one game in the admin Games Manager (`/app/admin`) and run its sync before scanning, or collections/scanning have nothing to match against. The `server` container applies Drizzle migrations, own-auth's own migrations, and the RLS bootstrap (`packages/server/src/db/bootstrap-local.sql`, run via `pnpm db:migrate-local` — see that script for why plain Postgres needs a few things Neon normally provisions automatically) on every start; all three steps are idempotent.

To grant a *second* admin, update their row in `platform_user_roles` directly — there's no UI for it yet:

```sql
INSERT INTO platform_user_roles (user_id, role) VALUES ('<their own_auth_users.id>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

This mode currently covers sign-up/sign-in/sign-out, session, and organisation switching/creation only — email verification, multi-device session management, and org member/invite UI stay Neon-only for now (see `CLAUDE.md`'s Auth & RLS section).

### Deploying with Neon

For the Neon-backed deployment (`AUTH_PROVIDER=neon`, the default), the database and auth still need a [Neon project](#setting-up-neon) set up first, and its connection details passed to the server container as env vars (`DATABASE_URL`, `NEON_AUTH_URL`, `WEB_URL`) and to the web build as build args (`VITE_API_URL`, `VITE_NEON_AUTH_URL`, `VITE_NEON_DATA_API_URL`, `VITE_APP_ENV`, `VITE_LATEST_FIRMWARE_VERSION`). A minimal setup:

```bash
docker build -f Dockerfile.server -t magic-vault-server .
docker run -p 3001:3001 --env-file .env magic-vault-server

docker build -f Dockerfile.web \
  --build-arg VITE_API_URL=https://your-api-host \
  --build-arg VITE_NEON_AUTH_URL=$VITE_NEON_AUTH_URL \
  --build-arg VITE_NEON_DATA_API_URL=$VITE_NEON_DATA_API_URL \
  --build-arg VITE_APP_ENV=production \
  --build-arg VITE_LATEST_FIRMWARE_VERSION=1.0.2 \
  -t magic-vault-web .
docker run -p 8080:80 magic-vault-web
```

Point `WEB_URL` (server env) at the public URL of the web container so CORS and Discord monitor-page links resolve correctly, and re-run `db:push`/`db:migrate` against the Neon database as part of your deploy if the schema changed.

`docker-compose.yml` wires the three images together (server on :3001, web on :8080, and the optional bot on :3002) reading build args and env vars from the root `.env`:

```bash
docker compose up --build              # server + web
docker compose --profile bot up --build  # + Discord bot
```

Still self-hosted-app-only — `.env` must already point `DATABASE_URL`/`NEON_AUTH_URL` at a real Neon project, since compose doesn't run a database.

## Hardware

The full bill of materials, wiring diagrams, and assembly instructions live in the app at `/build`. In short:

- Arduino Uno R4 or ESP32 Dev Module, driving a PCA9685 servo controller over I2C
- 3 positional SG90 servos per sorting module (trapdoor, paddle gate, pusher) plus 1 continuous-rotation SG90 for the feeder — module count is configurable (up to 5 on a single PCA9685) in Calibration
- IR sensor for card-feed detection
- Enclosure and module parts are in `3d model/` (Fusion 360 source + printable `.3mf`)

Upload `firmware/main/main.ino` (requires the ArduinoJson library) to either board via the Arduino IDE — see `/build` for the full flashing steps and per-board pin/wiring differences. The sketch is always compiled for the full module ceiling a single PCA9685 supports — it doesn't need to match how many modules you've actually built, since the app already knows each org's real module count and only ever sends route commands for modules that exist, so you can add modules later without reflashing. It communicates via JSON over USB serial: the web app sends `{"route": {"module": N, "direction": "left"|"right"|"bottom"}}`, resolved from the bin's routing assignment in Calibration, and the board runs the routing sequence. `"bottom"` advances the card through each preceding module (same as `"left"`/`"right"`) and drops it through the target module's own bottom output, rather than a shared catch-all — any bin can be assigned to any module's bottom output.

Where module 1 starts on the PCA9685 is also runtime-configurable, not baked into the firmware: a "PCA9685 channel layout" toggle in Calibration (Standard = channel 0, up to 5 modules; Legacy = channel 4, reserving 0-3 for the status LEDs older firmware drove, up to 3 modules) sends `{"setChannelOffset": N}` once per connection. Orgs with pre-existing module calibration data default to Legacy so already-wired hardware keeps working unchanged; new orgs default to Standard.

## Webcam

Using a Logitech C920, these settings worked best:

Auto Focus: Off
Focus: 50%
Auto Exposure: On
Low Light Compensation: On
Auto White Balance: On
Brightness: 140
Contrast: 140
Saturation: 160
Sharpness: 130

## Licensing

This repository contains multiple components with different licenses.

| Component               | License         |
| ----------------------- | --------------- |
| Software source code    | MIT License     |
| 3D models (`/3d model`) | CC BY-NC-SA 4.0 |

See the `LICENSE` file in each directory for the complete license terms.
