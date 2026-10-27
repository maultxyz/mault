# CLAUDE.md

Conventions and non-obvious invariants only. Feature details belong in the code. Keep additions to one line where possible.

## Commands

```bash
pnpm install
pnpm dev                                       # Vite :5173 + Hono :3001 (+ api-docs :5174)
pnpm build                                     # tsup (server), tsc -b + vite build (web)
pnpm --filter @magic-vault/web lint            # only package with a lint script
pnpm --filter @magic-vault/server test         # node:test via tsx, tests/*.test.ts
pnpm --filter @magic-vault/web test            # Vitest + jsdom + Testing Library
pnpm --filter @magic-vault/server db:generate  # migration from schema.ts changes (db:migrate, db:push for local iteration)
pnpm --filter @magic-vault/api-docs openapi    # regenerate packages/api-docs/public/openapi.json
pnpm --filter @magic-vault/web model           # STEP -> public/models/card-sorter.glb
pnpm --filter @magic-vault/mobile start        # Expo dev server (see packages/mobile/README.md)
pnpm --filter @magic-vault/desktop start       # Electron shell against MAULT_URL
```

Tests run in Build Check (`build-check.yml`): server `tests/*.test.ts` (node:test) and web `src/**/*.test.{ts,tsx}` (Vitest, own `vitest.config.ts` so tests skip the PWA/Tailwind plugins; CI is Node 26, so test deps must support it). Type-check via the `web` build (`tsc -b`) and editor diagnostics. See `CONTRIBUTING.md` (migrations) and `README.md` (env, Neon, self-hosting).

## Every change: keep all surfaces in sync

The product ships on three surfaces that must behave the same:

- **Desktop:** the web app at `md` and up, also loaded unchanged by the Electron shell (`packages/desktop`).
- **Mobile web:** the same web app below `md` (`useIsMobile`, `max-md:` styles, `Mobile*` components).
- **Mobile app:** the Expo app in `packages/mobile`, a separate React Native codebase.

For every change (feature, fix, copy, setting, API):

1. Work out how it affects each surface, including the mobile app when the request names only one.
2. Make it on every surface it applies to in the same task, or say which surface was left out and why.
3. Put logic both apps need in `shared` instead of duplicating it. Serial reply matching, the busy guard and the route queue live in `shared`'s `SerialSession` (web `use-serial` and mobile `SorterLink` wrap it); both `CloudTransport`s extend `SorterLinkConnection`.
4. Add every new string to all locales on every surface: web `locales/{en,de,fr}/*.json` and mobile `locales/{en,de,fr}.json`, with identical keys.
5. Keep server and API changes compatible with mobile app versions already in the stores (store releases lag web deploys).
6. End with a per-surface summary: changed, unaffected, or not done.

## Architecture

pnpm + Turborepo: `shared` (types, constants, zod schemas, rule engine, `vision.ts`, `serial-protocol.ts`; no build), `server` (Hono 4, Drizzle, Postgres), `web` (React 19 SPA), `mobile` (Expo), `desktop` (Electron shell), `bot` (Discord), `api-docs` (Scalar). One root `.env`. The Vite proxy strips `/api`, so server routes have no `/api` prefix. `docker-compose.yml` is the self-hosted stack.

### Auth & RLS

- `AUTH_PROVIDER` is `neon` (default) or `local`; `auth/index.ts` picks the provider and route code never branches on it. Bearer tokens everywhere, never cookies. The web client is chosen at module level from `VITE_AUTH_PROVIDER`.
- Org routes: `requireAuth` -> `requireOrg` (`X-Org-Id` adds `org_id` to the claims) -> `requireRole`/`requireOrgRole`. SSE (`routes/stream.ts`) rebuilds the same claims; without `org_id` every `orgRls` table reads empty.
- User-scoped DB access goes through `authQuery(jwtClaims, tx => ...)`. Plain `db` only for intentional RLS bypass (sync, webhooks, bootstrap, stats). New user/org tables use `.enableRLS()` + `crudPolicy` and need grants in `db/bootstrap-local.sql`.
- Platform staff routes use `requireRole(...PLATFORM_STAFF_ROLES)`; card sync, card database tools, plans, hardware and developer stay `requireRole("admin")`. Web gates with `useRole().isStaff`, `AdminGuard` and `adminOnly`.
- A 403 signs the web client out, so owner/admin checks on pages members can reach are done inline.
- Route handlers don't wrap their work in try/catch: `app.onError` logs and returns the JSON 500, and `/v1` registers its own `onError` (Scryfall error) before it is mounted. Catch only to turn a specific error into a different response.
- Local auth (own-auth): `getOwnAuth()` stays lazy because `auth/local.ts` is imported in Neon mode too and `createOwnAuth()` throws in production without `OWN_AUTH_TOKEN_PEPPER`. `LocalEmailProvider.send()` must never throw (own-auth calls it for every invite and reset); invite links are captured per request through AsyncLocalStorage because own-auth only returns raw tokens when `exposeRawTokens` is set. Local API keys are personal (no `organisationId`), so they map onto a normal `{ sub }` session. The first account on a fresh local instance becomes platform admin. Password-reset responses stay generic (no account enumeration).
- The active org lives in localStorage for both providers: own-auth has no active org, and Neon's cached session lags `organization.setActive`.

### Public API & webhooks

- Defined once in `shared` (`schemas/public-api.schema.ts`, `PUBLIC_API_ENDPOINTS`); a new endpoint needs a registry entry, schemas and a handler in `routes/v1/index.ts`, then regenerate `openapi.json`.
- API-key queries run through `apiKeyQuery(orgId, ...)`; a `/v1` query on a new table needs a migration grant and an `api-service-policy-*` policy.
- `/v1` responses follow Scryfall conventions (`object`, snake_case, list envelope), not the app's `{ success, data }`.
- `emit*Webhook` only enqueues; deliveries use `safeLookup` and no redirects. A new event needs `WEBHOOK_EVENTS`, an `emit*` in `lib/webhooks/events.ts` and translations.

### Cards (multi-TCG)

- One adapter per game in `server/src/lib/adapters/<game>/`, registered in `card-search/resolve.ts` and `lib/sync-job.ts`, plus a `Game` row.
- `cards.data` stores the API's raw card object (read through `normalizeStored`); one entry per artwork; art through `toPortraitCardImage()`; every `cards.data` write also sets `collector_number`.
- Never hardcode source-specific fields: read through the game's `fieldDefinitions` and `getByPath`/`getCardValue`. Game-specific behaviour goes on the adapter (e.g. `rarePrintingSql`).
- TCGTracking (`lib/tcgtracking/`) wraps every sync source and adapter whose game is in `TCGTRACKING_GAMES`: linked cards get `tcgtrackingProductId` (read as `tcgplayerId`), cards the primary lacks become `tcgp-<productId>` fallbacks normalized from TCGTracking data, and covered fallbacks get `supersededByCardId` and drop out of matching. English only.
- Rules store field keys only; anything new that stores a field key goes in `lib/field-renames.ts`.
- Rule evaluation runs on `toRuleCard(...)` with `withScanRuleFields`; never save a `$scan` card. Text comparisons are trimmed and lowercased.
- Scanning never calls upstream card APIs (reads go through `card-search/stored-cards.ts`). netdeck images render through `/cards/netdeck-image/...` because their URLs expire.
- `collection_cards.card` is large and TOASTed: SQL that scans many rows reads the stored generated `card_*` columns (and `has_alternative_matches`, `card_saved_price*`), never `cc.card ->> ...`; a new hot field gets a generated column. Long lists page on the server.

### Prices

- `scripts/sync-prices.ts` runs on an external schedule only. tcgcsv: at most one pull per 20 h, check `last-updated.txt` first, 1 request/s, `CARD_API_USER_AGENT` on every outgoing request, never from request paths.
- Never read `card.price` for display or totals: use `cardPriceFor`/`formatPrice` (web `usePriceSource().priceOf`) or server `loadOrgPricing`. SQL totals take the org's `OrgPricing`. Currencies never mix.
- `collection_cards.card` keeps the prices it was saved with: that is the scan-time price (`pricesAtScan`, added on read), so never refresh prices inside it.

### Soft deletes

- Hard-deleted only: `collection_cards`, unmatched scan photos, `cards`, `webhook_endpoints`, whole-org purges. Everything else sets `is_deleted`.
- Audit tables have no foreign keys: their rows are permanent.
- Every read, count, limit check and lookup filters `is_deleted = false` (including `with:` blocks and raw SQL); fix-up writes don't. Uniqueness uses partial indexes on live rows; upserts set `isDeleted: false`.
- A new soft-deletable table needs the column, filtered reads, `DELETED_ITEM_TYPES` and `routes/admin/deleted-items-sources.ts`.

### Scanning

- Swapping the embedding model is a breaking migration. There is no table-wide HNSW index: each `game_key` (and lang) gets a partial index built by `ensureGameVectorIndex` (`CREATE INDEX CONCURRENTLY` on a dedicated client, fire-and-forget from the Games routes). Filtered embedding queries need `hnsw.iterative_scan`. Rebuild vector indexes through `rebuildGameVectorIndex` (plain `REINDEX` keeps old params); sync skips `volatileDataKeys` diffs to avoid HNSW churn.
- `findCardMatches` prefers a regular printing over a same-art promo or list reprint (`rarePrintingSql`); an explicit preferred set wins.
- Every query that compares a scan against `cards` (embedding, OCR name, preferred set) adds `matchingExclusionFilter(scope)`, which skips the adapter's `excludedFromMatchingSql` rows (Scryfall `digital` printings). The rows stay synced.
- An onnxruntime-web WASM `RuntimeError` is permanent for the page; don't retry.
- Server OCR is PaddleOCR on onnxruntime-node (`lib/paddle-ocr.ts`, pinned in `constants/ocr.ts`, pre-downloaded in `Dockerfile.server`): one detection pass over the whole card, then regions anchor to the detected lines and only unanchored regions are read from their fixed box. The v5 recognizer needs input height 48 and the small v3 detector is deliberate (the v5 server detector is about 9x slower on a Pi).
- Mobile Safari reloads tabs that pile up canvas memory: reuse scratch canvases, free per-scan ones with `releaseCanvases`, warp on the CPU (`warpRgba`), never WebGL.
- Saves go through `PendingScanSavesProvider`, never directly. Bin capacity is checked client-side before routing; a routed card stays pending until bin counts with a later `dataUpdatedAt` land.
- Web, mobile and Pi scanners route a scan through `shared`'s `resolveScanBin` (`scan-routing.ts`: pick list, then auto-assign, then mode dispatch and the full/complete pauses); never re-implement that order per app. Mode helpers live in `evaluate-bin.ts`.
- Never put a collection's full card list in a stream payload; unmatched scans are paged and bin fill comes from `/cards/bin-counts`.
- Stats that must survive deletes read `scan_stats`/`org_daily_scan_usage`. Scan images are read through `resolveScanImageUrl`.
- Control cards: `shared`'s `scanner-control-code.ts` owns the versioned `mault-control:` QR payload (unknown keys reject the card, so bump the version for new fields). Web checks for a QR before identifying; mobile only after a no-match (jsQR is slow on Hermes). A control card is never saved: it routes like an unmatched card, and a bad card pauses.
- Any correct, confirm or review accept sets `is_reviewed` and clears `low_confidence_match`; `is_corrected` stays separate.
- Plan features/limits: a key in `shared` (`PLAN_FEATURE_KEYS`/`PLAN_LIMIT_KEYS`) plus its check; limits apply on create/enable only.
- In-process server state (locks, leases, sorter links, rate limits) is per process.
- Single-card changes emit `collections_changed` through the throttled `emitCollectionCardsChanged`; web card queries refresh through the throttled `invalidateCollectionCards`.
- Every connected sorter is a station (a tab) plus one idle standby. Background stations stay laid out (never `display: none`) so their scanners keep sorting.

### Firmware & serial

- Protocol: `firmware/PROTOCOL.md`. Firmware has no bins; the app maps bin -> (module, direction).
- One command at a time; every blocking wait goes through `waitMs()`; pusher moves through `setServoPosition()`.
- `handleCommand` parses its line as `const char*` and prints replies directly. New `ModuleConfig`/`FeederConfig` fields go in `MODULE_FIELDS`/`FEEDER_FIELDS` too; changing `ModuleConfig` needs an EEPROM layout migration.
- A function whose signature uses a sketch-defined struct needs a manual prototype right after the struct.
- Firmware `route` runs the feeder first when module 1 reads empty, so scan routes pass `requireLoadedCard` (`readIR` before routing) or they sort an unscanned card; only calibration routes rely on the implicit feed.
- Replies match by `seq`: use `sendRequest`/`sendRawCommand`. Minimum-firmware features go in `FIRMWARE_FEATURE_MIN_VERSIONS` with a gate and a fallback.
- ESP32-S3 builds pin `FlashMode=dio` and `PartitionScheme=min_spiffs`; `esp32-flasher.ts` writes the merged bin around NVS, never whole at 0.
- Pusher directions are mirrored (`"left"` lands right); render through `BIN_SLOTS_PHYSICAL_ORDER`, never change routes to fix the display.
- Serial controls require `useSerial().isReady`; hardware-editing pages use `SessionLock`; new commands go in `DEVICE_COMMANDS`.
- `requestPort`/`requestDevice` must be the first await in the click handler: browsers only show the picker from the originating gesture.
- Wi-Fi remote (`cloud_common.ino` plus `cloud_esp32.ino`/`cloud_wifis3.ino`): the relay is in process, so board and browser must reach the same server process; Wi-Fi is configured only over USB/BLE; never flash over `cloud`; never start Wi-Fi from `setup()`. The app gates setup on `useSerial().hasWifi`, not the board type.
- Uno R4 WiFi: Wi-Fi and BLE share the co-processor, one per boot, and switching restarts the board. Its networking runs from `cloudPoll()`, with the modem timeout under the watchdog and no joins or TLS handshakes while a command runs.
- Changing `BIN_HEIGHT_PRESETS` needs a data migration. The 3D model maps raw pulses (never percentages) to degrees; rerun the model script after changing the STEP file.

### Mobile app (`packages/mobile`)

- Captured photos go through `resizeAsync` before reading pixels (iOS orientation).
- ONNX runs on the CPU provider only so embeddings match the fp32 vectors from web and server.
- Sorters connect over BLE or the Wi-Fi relay, never USB. Android needs `ensureBlePermissions` first.
- No in-app account creation (App Store would then require in-app deletion).

### Desktop (`packages/desktop`)

- Loads the hosted web app, never a bundled copy. The web app talks to it only through the feature-detected `window.maultDesktop` bridge (`DesktopBridge` in `shared`).
- Thumbnail buttons: no calls until shortly after the main window is first shown, and never pass `flags: ["enabled"]`.
- Serial permissions only allow ports picked through `device-picker.ts`; the permission handler receives Chromium's snake_case object, not the picker's.
- `backgroundThrottling: false` hides occlusion from the page, so "covered or minimized" comes from `window-state.ts`/`window-coverage.ts`.

### Business tools

- `/business` routes go through `businessQuery`; permission failures return 200 with `success: false`, never 403.
- Every path that inserts `collection_cards` stamps `intake_lot_id` via `findOpenIntakeLotId`. Cards in open or cancelled lots aren't inventory (count only `intake_lot_id IS NULL OR status = 'accepted'`).
- Write costs through `updateAcquisitionCosts`; sums only include the org's current currency. Fulfilling an order hard-deletes its cards and writes permanent `card_sales`.
- Sorter alerts go through `raiseDeviceAlert`. Audit-worthy mutations call `logActivity(tx, ...)` in the same transaction; a new action needs `ACTIVITY_ACTIONS`, `ACTIVITY_ACTION_KEYS` and translations.

### Pi scanning

- The Linux API service sets `API_HOST=127.0.0.1`; Pi hosts also default to loopback when unset. Remote clients use port 8080 through the existing HTTP/WebSocket `/api` proxy. Keep the default `0.0.0.0` for non-Pi deployments unless explicitly configured.
- Install and update service units through `scripts/pi/install-services.mjs`, which renders the actual checkout path and escapes systemd path specifiers and command arguments. Do not copy the `~/mault` unit templates directly; Linux installs can use a different directory.
- The scanner camera is the USB webcam, served by `scripts/pi/camera-ctl.py` on `127.0.0.1:8765` and exposed through the authenticated API at `/api/pi-camera`. The web server must not proxy directly to the helper. Frames are re-encoded to JFIF before they go out.
- Remote-browser Pi behavior (serial bridge, camera relay, hiding the connect prompt) turns on only when the API reports `piHost`. That is true when `PI_HOST=1` (set by `scripts/pi/install.sh`, which also installs Node 22, pnpm, Postgres with pgvector, ffmpeg, and v4l-utils) or when `/proc/device-tree/model` is a Raspberry Pi. `PI_HOST=0` forces it off.
- A remote browser on a Pi host opens the sorter through `/pi-serial` (`lib/pi-serial-bridge.ts`). The port is claimed in `lib/pi-serial-port.ts`, so the Pi scan session and a browser cannot hold it at the same time. The node is `root:dialout` mode `660`. `install.sh` adds the desktop user to `dialout` and restarts the user manager when this login does not have the group yet. Raspberry Pi OS already puts its user in `dialout`; Other Linux Distros do not.
- Pi-owned scanning (`lib/pi-scan/session.ts`, `GET/POST/DELETE /scan-session`) runs the loop in the API process. It feeds, waits the device capture settle delay once, then takes the scan photo. Full bins and completed packs hold the current card until resume, which reloads bin state. The serial link uses shared seq/event helpers and rejects pending work on disconnect. Pi matching uses `scan-identify.ts` and bin routing uses `resolveScanBin`; browser-only removal queues and QR control cards are not part of the Pi-owned loop.
- Both sync paths use the admin "cards at a time" control. The server path sets `VECTORIZE_CONCURRENCY` on the sync worker. "Start on this computer" (`vectorizeOn: "browser"`) is offered only when the API reports `piHost`. It hands cards missing front or back image vectors to the open admin page; the control limits cards in flight, while `BROWSER_EMBED_WORKER_MAX` separately caps model workers. `crypto.subtle` is missing on plain HTTP, so model hashing falls back to `fast-sha256`. Browser offloading is for bulk database sync only; live card identification stays on the Pi. A fatal runtime failure stops the job until page reload.
- `scripts/pi/update.sh` follows the installed branch's tracking remote with a fast-forward only. Refuse local changes and unpublished commits; never reset or stash them automatically. Stop services before changing code or builds, rebuild both apps, then refresh and start services. Preserve `.env`; database migrations run through `run-api.sh` at startup. Keep updater execution inside a parsed function so fetching a replacement of its own script cannot change the running procedure.
- Browser-triggered host updates require platform admin and `piHost`, and refuse active scans, sorter connections and sync jobs. Run `run-update.sh` in a separate systemd user job so it survives API restarts; persist its result under the Mault state directory. The browser version mismatch means refresh; host update availability compares the running API package version with `packages/server/package.json` on the configured Git upstream, not commit hashes.

### Discord bot

- Each guild maps to one org; every channel and rule target is validated against the linked guild, and mentions are limited to the requested roles.
- `discord_user_links` is server-only (plain `db`, filtered by the verified `userId`). Scan notifications go through `lib/scan-notification-queue.ts`.

### Deploys

- `deploy.yml` builds GHCR images; Coolify pulls `:latest` (master) or `:dev`. Anything that changes a baked-in file (e.g. firmware) must dispatch `deploy.yml`.
- Web `VITE_*` config is runtime: read it through `runtimeEnv()`, never `import.meta.env.VITE_*` (only `VITE_LATEST_FIRMWARE_VERSION` is a build arg).
- Mobile, desktop and firmware have their own release workflows and versions. Mobile `MOBILE_*` values must be set as EAS environment variables. Firmware versions are bumped by the release workflow.

## Web conventions

- Feature-first: `features/<name>/{api,components,lib}`; cross-feature code in top-level `components/`, `hooks/`, `lib/`. API calls through `lib/api/client.ts` or `features/*/api/`.
- Forms: React Hook Form + Zod resolver, never `useState` per field. Schemas for forms both apps have live in `shared` (`schemas/forms.schema.ts`); schema messages are `formValidationMessage(...)` keys (`validation.*` strings), translated by web `FieldError` and mobile `translateFormErrorMessage`, never literal English.
- Nothing auto-saves: settings edit a draft saved through the page's single `SaveBar` with `UnsavedChangesGuard`. Draft forms take server data via `values` with `resetOptions: { keepDirtyValues: true }`; Discard passes `DISCARD_RESET_OPTIONS`. Discrete actions stay immediate.
- Hotkeys only through `useHotkeys`, declared in `HOTKEYS`. Toasts only through the root `Toaster`.
- Settings sub-pages use `SETTINGS_PATHS`, `SettingsSection` panels and a `settings:sectionIntros` entry; moving a panel means updating `CALIBRATION_TOUR_STEPS`.
- Mobile web screens use `MobilePageHeader`, the `MOBILE_*` classes and `MOBILE_NAV_SCROLL_PADDING_CLASS` on scroll areas. Keep popovers other than `Select` out of vaul drawers.
- Card actions belong in `useCardActions`. The UI calls a `bin_sets` row a "preset", never a "set".
- The app stream (`lib/app-stream.tsx`) is one shared EventSource: subscribe with `addEventListener`, never `onerror`/`onopen`, which would replace other consumers' handlers.
- localStorage access can throw (Safari private mode, blocked storage), so always guard it.
- Only the `common` i18n namespace loads at startup; routes load theirs through `withNamespaces()`.
- Public marketing pages render outside the app's `QueryClientProvider`, so components there use their own client or read-only stand-ins (`demo-*`).

### UI style

- Status colors only from theme tokens (`success`, `warning`, `info`, `destructive` and their shades); raw palette colors are for data only. Fix tokens rather than hand-patching dark-mode text.
- In-page notes use `Callout`, full-width bars `AlertBanner`, empty lists `EmptyState`, labelled sliders `SliderField`. Loading uses skeletons; spinners only for in-progress actions.
- Text: `text-sm` body, `text-xs` secondary, `text-2xs` captions, no `text-[Npx]`. The text tokens already grow below `md`, so no per-component `max-md:text-*` bumps. Inputs stay `text-base` below `md`. Secondary text is `text-foreground/70`; `text-muted-foreground` only in `components/ui` primitives and placeholders.
- Radius: `rounded-xl` overlays, `rounded-lg` containers, `rounded-md` controls, `rounded-sm` tiny bits, `rounded-full` pills; never plain `rounded`.
- Icons in shadcn primitives take no `size-*` class; standalone icons use `size-3`/`3.5`/`4`/`5`.
- Motion: short `animate-in` for new content only, with `motion-reduce:animate-none`. No route transitions.

## Code style

- **YAGNI:** don't build it until you need it.
- **DRY:** extract a pattern after the second duplication, not before.
- **Fail fast:** explicit errors beat silent failures.
- **Simple first:** write the obvious solution; optimize only when needed.
- **Delete aggressively:** less code means fewer bugs.
- **Semantic naming:** name variables, parameters and API endpoints with verbose, self-documenting names that optimize for comprehension by humans and LLMs, not brevity (`waitUntilScanIsSaved: true`, not `wait: true`), in the language's own casing.
- No code comments in app code (firmware sketches keep theirs); record non-obvious things here instead. No `eslint-disable`.
- Types, interfaces and constants never live in component, hook or route files: `lib/interfaces/*` and `lib/constants/*` per package, shared ones in `shared`.
- Never use em dashes anywhere (code, copy in every locale, commits, chat).
