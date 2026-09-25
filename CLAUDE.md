# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm dev                                      # turbo dev: Vite :5173 + Hono :3001, in parallel
pnpm --filter @magic-vault/server dev          # server only
pnpm --filter @magic-vault/web dev             # web only

pnpm build                                    # turbo build (tsup for server, tsc -b + vite build for web)
pnpm --filter @magic-vault/web lint            # eslint — the only package with a lint script

pnpm --filter @magic-vault/server db:generate  # generate a migration from schema.ts changes
pnpm --filter @magic-vault/server db:migrate   # apply migrations
pnpm --filter @magic-vault/server db:push      # push schema directly, no migration file (fast local iteration only)
pnpm --filter @magic-vault/server db:studio    # open Drizzle Studio
```

There is no automated test suite in this repo. `packages/server`/`packages/shared` have no lint script either — rely on the `web` build (`tsc -b`) and editor TypeScript diagnostics as the type-check gate for the other two packages.

See `CONTRIBUTING.md` for the full database-migration workflow and `README.md` for environment/Neon setup.

## Architecture

pnpm workspace + Turborepo, three packages: `shared` (framework-agnostic types/constants/rule engine, no build step — resolved straight to `src/index.ts`), `server` (Hono 4 API + Drizzle ORM + Postgres, either Neon-hosted or self-hosted — see Auth & RLS below), `web` (React 19 SPA). A single root `.env` is read by both the server (`tsx --env-file ../../.env`) and Vite (configured to read up from `packages/web`). `docker-compose.yml` runs a fully self-hosted stack (`AUTH_PROVIDER=local` + `pgvector/pgvector` Postgres, no Neon account needed) — see README's self-hosting section.

### Auth & RLS

- Two identity providers, selected by `AUTH_PROVIDER` (`neon`, the default, or `local`) — see `auth/index.ts`, which picks between `auth/neon.ts` and `auth/local.ts`'s `AuthProvider` implementations (`auth/types.ts`). `middleware/auth.ts`'s `requireAuth`/`requireOrg`/`requireRole`/`requireOrgRole` are provider-agnostic and delegate to whichever is active; route code never branches on the provider directly.
  - **`neon`**: Neon Auth issues JWTs, verified via JWKS (`auth/neon.ts`). Org membership and user lookups are raw SQL against Neon's own `neon_auth.*` tables (a separate Postgres schema Neon provisions, not modeled in this repo's Drizzle schema).
  - **`local`**: fully self-hosted — [own-auth](https://own-auth.com) issues opaque session tokens against the app's own Postgres (its `own_auth_*` tables, created by `own-auth migrate`, live in the same `public` schema as the app's own tables). `auth/local.ts` calls the `OwnAuth` engine's methods directly rather than mounting its HTTP handler, since that handler is cookie-oriented and doesn't expose organisations at all — this app is bearer-token-only everywhere (see `routes/local-auth.ts`). A per-user platform role (used by `requireRole("admin")`) has no own-auth equivalent, so it lives in the app's own `platformUserRoles` table instead.
- Middleware chain on org-scoped routes: `requireAuth` (verifies the `Authorization: Bearer` token via the active provider, sets `userId`/`userRole`) → `requireOrg` (reads the `X-Org-Id` header, resolves membership via the active provider, sets `orgId`/`orgRole`, and rebuilds `jwtClaims` to include `org_id`) → `requireRole`/`requireOrgRole` for authorization gates.
- Two DB access paths: `db` (`db/index.ts`, plain pool, no RLS) and `authQuery(jwtClaims, tx => ...)` (wraps a transaction, sets `request.jwt.claims`, and — in `local` mode only — `SET LOCAL ROLE authenticated`, since Neon's connection-level `pg_session_jwt` extension does that mapping automatically in `neon` mode instead). Use `db` directly only for intentional RLS-bypass work (the sync job, Discord webhook lookups, provider-specific user/org bootstrap). New tables holding user/org data should follow the existing `.enableRLS()` + `crudPolicy({ role: authenticatedRole, ... })` pattern in `db/schema.ts` — both providers rely on the same `authenticated` Postgres role and `auth_is_org_member()` function existing (Neon provisions them; `local` mode's equivalent is `db/bootstrap-local.sql` / `scripts/migrate-local.ts`).
- The web client mirrors this split: `lib/auth/provider.ts`'s `VITE_AUTH_PROVIDER` selects between the Neon-specific client (`lib/auth/client.ts`, `@neondatabase/neon-js`'s `BetterAuthReactAdapter`) and local mode's own bearer-token client (`lib/auth/index.ts`, `lib/auth/local-session-store.ts`), dispatched via module-level ternaries (e.g. `features/companies/api/use-organization.tsx`) rather than runtime branching inside shared hooks. Local mode covers sign-up/sign-in/sign-out/session/org-switch, its own org invite UI (`features/companies/components/local-org-invites.tsx`), personal API keys (`features/account/components/api-keys-manager.tsx`), and an org audit log (`features/companies/components/local-audit-log.tsx`) — email verification, profile/password editing, and multi-session management remain Neon-only (gated behind `AUTH_PROVIDER` at the route/component level, e.g. `app/routes/app/account.tsx`, `app/routes/app/settings.tsx`).

### Multi-TCG card search & sync

- Each supported game is a pluggable adapter under `packages/server/src/lib/adapters/<game>/` (currently `scryfall`, `gundam`, `pokemon`, `lorcana`, `onepiece`, `fab`, `yugioh`, `riftbound`): a `search.ts` exporting a `CardSearchAdapter` (`search`/`searchById` → `PlayingCard`) and a `sync.ts` exporting a `SyncSource` (`fetchCards`/`fetchOne` → `SyncSourceCard`, for the admin bulk image-vectorization job). A `SyncSourceCard` also carries the source API's own card object, untouched (`withRawData`, pre-serialized to keep the worker's memory down), which is stored in `cards.data` and turned into a `PlayingCard` on read by the adapter's `normalizeStored`. So a sync source must fetch complete card objects, not just id/name/image, and must store them in the API's own shape, never a normalized one.
- `card-search/resolve.ts` maps a `Game.key` to its `CardSearchAdapter` (`ADAPTERS_BY_GAME_KEY`); `lib/sync-job.ts` maps it to its `SyncSource` (`SYNC_SOURCES`). Adding a new TCG means adding both, then creating a `Game` row (via the in-app Games Manager, not a code seed) with that key.
- Every adapter normalizes into the same `PlayingCard` shape (`shared/interfaces/card.interface.ts`) regardless of the source API's own shape — that's the app's canonical card schema. `PlayingCard.id` is always per-printing/per-art granularity (not per card name), since that's what gets vectorized and matched against a scan.
- Each `Game` carries its own admin-configurable `fieldDefinitions: FieldMeta[]`, read generically via `getByPath()` to drive bin rules, card-grid sorting, and Discord notifications. Don't hardcode source-specific fields (e.g. Scryfall's `prices.usd`) in anything meant to work across games.
- Search results are wrapped in an in-memory TTL cache (`card-search/cache.ts`'s `withCache`).
- The sync job stores each card's raw API object in `cards.data`, so the card routes go through `card-search/stored-cards.ts` rather than calling adapters directly: text search is a plain case-insensitive name match against stored cards only (never the upstream API), and by-id lookups (the scan path) read the stored card, falling back to the upstream API only when the row has no stored data.
- Prices come from a daily TCGplayer pull, not the stored card data: `scripts/sync-prices.ts` (`lib/tcgplayer-price-sync.ts`, run by an external scheduler, e.g. a Coolify scheduled task running `node packages/server/dist/scripts/sync-prices.js`) upserts tcgcsv.com's per-group prices into `tcgplayer_prices`, and `card-search/tcgplayer-prices.ts` overlays the TCGplayer mid price (as `price`/`priceFoil`) plus its low/mid/high (`priceRange`/`priceRangeFoil`, shown in the card details) onto every card read through `stored-cards.ts`, keyed on `PlayingCard.tcgplayerId`. A game opts in via its adapter's `tcgplayer` (tcgcsv category id + which sub-types feed `price`/`priceFoil`). tcgcsv blocks generic User-Agents and asks for ~100ms between requests and one pull per daily build, which the job follows.

### Bulk sync job

- `lib/sync-job.ts` runs a single global in-memory job (one sync at a time), streamed to the admin UI over SSE (`routes/admin.ts`'s `/sync/stream`, via `hono/streaming`'s `streamSSE`). The JWT is passed as a `?token=` query param since `EventSource` can't set custom headers.
- Cards are fetched, vectorized (CollectorVision's Milo embedder, `lib/milo.ts`/`lib/vectorize.ts`) across `VECTORIZE_CONCURRENCY` parallel workers, and inserted in batches (`SYNC_INSERT_BATCH_SIZE`). Cards already vectorized (and so skipped) still get `cards.data` refreshed in batches first, so a plain non-forced sync backfills card data and keeps prices current without re-vectorizing. `processed`/`errors` counts only advance once a batch insert is confirmed — never when a card is merely queued into a pending batch — since several cards can share one batch's outcome.
- Job state lives in server process memory, not the DB, so it survives a page refresh but not a server restart; reconnecting SSE just flushes current state.

### Scanning & hardware routing

- Card identification is a [CollectorVision](https://github.com/HanClinto/CollectorVision)-family pipeline: a corner detector (currently `HanClinto/ccgdetector-fastweb-single`, MIT — swapped in from the original AGPL Cornelius model since it shares the identical 384×384-in / corners+presence+sharpness-out contract) finds the card and perspective-dewarps it to a canonical 448×448 crop, and Milo (`HanClinto/milo`, AGPL-3.0, 128-dim, L2-normalised) embeds it. Both run as raw ONNX graphs (not through `@huggingface/transformers`) — client-side via `onnxruntime-web` (`features/scanner/lib/cornelius.ts`, `perspective-warp.ts`, `milo-client.ts`, `onnx-runtime.ts`), server-side via `onnxruntime-node` (`lib/milo.ts`) for the sync job and the server-side scan fallback, which only ever runs Milo — sync-source images are already clean single-card crops, and the server-side live-scan fallback intentionally skips corner detection/dewarp entirely (client-only capability), so match quality there depends on the static scan-region crop, not a real detection. Model weights are pinned by exact HF revision + SHA-256 and pulled at runtime rather than committed to the repo — server-side via `lib/models/model-registry.ts` (downloaded once, cached to disk, verified by SHA-256 before every use); client-side via `features/scanner/lib/model-fetch.ts` (downloaded via `fetch()`, cached in IndexedDB, same verify-by-hash pattern) — mirroring the old SigLIP Docker pre-download pattern's "pin and verify, don't trust a moving registry" approach without committing binaries to git. `cards.embedding` is `vector(128)`; there's no per-crop-region embedding (art/name/bottom) anymore — one embedding per card, matched via a plain top-K cosine search (`routes/card/shared.ts`). Swapping the embedding model is a breaking migration (see `drizzle/0037_little_marvel_apes.sql` for the pattern: truncate `cards`, alter the vector dimension, drop the per-game HNSW indexes, force-resync every game afterward via the admin sync panel's "Force full resync", which rebuilds `game-vector-index.ts`'s indexes automatically).
- The physical sorter's serial protocol is documented standalone in `firmware/PROTOCOL.md` — read that rather than re-deriving it from the web client.
- Scanning is desktop-only; `DesktopOnlyGuard` in `app/router.tsx` redirects mobile clients to `/app/monitor` for live remote viewing of an in-progress session over SSE (`lib/session-stream.ts`).
- `lib/scan-lock.ts` prevents two concurrent scan sessions against the same collection.
- `lib/device-leases.ts` caps how many sorters an org can have connected at once (free plan: `FREE_PLAN_MAX_CONNECTED_SORTERS`; every plan, including Business and billing-disabled self-hosting, is also hard-capped at `MAX_CONNECTED_SORTERS` from `shared`). Clients take a lease via `POST /devices/:guid/lease` after binding a board and renew it on a heartbeat; `cards-add.ts` re-checks and renews it on every scan, so the cap holds across browsers and computers. In-memory like the scan lock, so a restart just makes clients re-acquire.
- One browser tab can drive several sorters at once as "stations" (`features/scanner/api/use-stations.tsx`). Each `StationScope` (`features/scanner/components/station-scope.tsx`) owns its own camera, serial link, collection, calibration and scanned-cards providers; stations follow physical connections, not user actions: each connected sorter is a station shown as a tab (`station-tabs.tsx`, display-only), plus exactly one idle standby station that the next connect (including the scanner menu's "connect another sorter") goes through. Connecting promotes the standby and spawns a new one; a disconnecting sorter becomes the standby. Only the active station renders the routed app, while every live station portals its scanner column into the scanner page (`station-panels.tsx`), where background tabs stay mounted but invisible so they keep scanning. Per-board camera and collection choices persist by device guid, not by station. On connect, the firmware's `id` is resolved server-side (`POST /devices/resolve`, `lib/devices.ts`) to the org's device record for that board (exact match, else claim an unbound record, else create one), and `useDevice()` returns the station's bound device. An org can own many `devices` rows (unique per `org_id` + `hardware_id`).
- The firmware has no concept of a "bin" — the web app owns the bin→(module, direction) mapping (`shared/interfaces/bin-routes.interface.ts`) and resolves it before ever sending a serial `route` command.

### Web structure

- Bulletproof React, feature-first: `features/<name>/{api,components,lib}` (current features: `bins`, `calibration`, `cards`, `collections`, `companies`, `games`, `notifications`, `scanner`). Cross-feature code only belongs in the top-level `components/`, `hooks/`, `lib/` — not a feature folder.
- Routing is React Router v7 under `app/routes/` (`app/*` for the authenticated app shell, `build/*` for the in-app hardware build guide, plus `landing`/`auth`).
- `@/*` resolves to `packages/web/src/*`.
- All API calls go through `lib/api/client.ts` (`apiGet`/`Post`/`Put`/`Delete`/`PostForm`) or feature-specific wrappers under `features/*/api/`, always with `Authorization: Bearer <token>` — never cookies.
- Forms always use React Hook Form + a Zod resolver — never a hand-rolled `useState`-per-field form.
- The Vite dev proxy rewrites `/api/*` → `http://localhost:3001/*`; server routes are registered without an `/api` prefix to match (`app.route("/collections", ...)`, not `/api/collections`).

## Code style

Don't write excessive comments — code should be self-documenting through clear naming and structure. Only add a comment when it explains something the code itself can't: a non-obvious constraint, a workaround for a specific external system's quirk, or an invariant that would surprise a reader. Don't restate what the code already makes obvious.

Never use em dashes, in code, comments, commit messages, or chat responses. Use a comma, colon, or period instead, or split into two sentences.
