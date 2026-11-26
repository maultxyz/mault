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
python3 -m unittest scripts.pi.controller.test_controller scripts.pi.controller.test_detection_hardware # GPIO controller, mocked hardware
python3 -m unittest discover -s scripts/pi/tests -p 'test_*.py' # Pi camera, installer, updater, mocked system commands
pnpm --filter @magic-vault/server db:generate  # migration from schema.ts changes (db:migrate, db:push for local iteration)
pnpm --filter @magic-vault/api-docs openapi    # regenerate packages/api-docs/public/openapi.json
pnpm --filter @magic-vault/web model           # STEP -> public/models/card-sorter.glb
pnpm --filter @magic-vault/web instruction-images # resize public/instructions photos + build-step-images.ts
pnpm --filter @magic-vault/mobile start        # Expo dev server (see packages/mobile/README.md)
pnpm --filter @magic-vault/desktop start       # Electron shell against MAULT_URL
pnpm --filter @magic-vault/shortener test      # node:test via tsx
pnpm --filter @magic-vault/tutorials tutorial <name> # captioned tutorial video (see the `tutorial` skill)
```

Build Check (`build-check.yml`, Node 26, Python 3.13) runs all the test suites above; it doesn't validate physical USB/GPIO motion or cameras. Type-check via the `web` build (`tsc -b`) and editor diagnostics. See `CONTRIBUTING.md` (migrations, shared scanning checklist) and `README.md` (env, Neon, self-hosting).

## Every change: keep all surfaces in sync

- **Desktop:** the web app at `md` and up, also loaded unchanged by the Electron shell (`packages/desktop`).
- **Mobile web:** the same web app below `md` (`useIsMobile`, `max-md:`, `Mobile*` components). It mirrors the Expo app's layout and flow, built from the web's desktop components; anything added to the Expo app lands here in the same task, and it shows nothing the app lacks (web-only features stay at `md`+).
- **Mobile app:** the Expo app in `packages/mobile`, a separate React Native codebase.
- **Headless Pi host (`piHost`):** the API owns camera and sorter and keeps scanning with browsers closed; it uses the web UI, but include it in every feature assessment.

For every change (feature, fix, copy, setting, API):

1. Work out how it affects each surface, including the mobile app when the request names only one.
2. Make it on every surface it applies to in the same task, or say which was left out and why.
3. Put logic both apps need in `shared`. Serial reply matching, busy guard and route queue live in `shared`'s `SerialSession` (web `use-serial`, mobile `SorterLink`); both `CloudTransport`s extend `SorterLinkConnection`.
4. Add every new string to all locales: web `locales/{en,de,fr}/*.json` and mobile `locales/{en,de,fr}.json`, identical keys.
5. Keep server and API changes compatible with mobile app versions already in the stores (missing new request fields keep old behavior; old endpoints stay).
6. Meet WCAG 2.2 AA on every surface (see Accessibility).
7. End with a per-surface summary: changed, unaffected, or not done.

Scan decisions follow `CONTRIBUTING.md#shared-scanning-features-and-pi-host`: decisions in `shared` (`runScanWorkflow`, `runScanDisposition`, scan plans, identify helpers), never only in a React hook or a separate Pi algorithm; camera, inference, serial/GPIO, HTTP and UI effects stay in adapters; new host state goes through org-scoped session snapshots/events.

## Accessibility (WCAG 2.2 AA, required)

- Web lint runs `eslint-plugin-jsx-a11y` (strict); fix findings, never disable rules. `autoFocus` only for a dialog/popover's first field, single-form auth pages and global search.
- Every control has an accessible name: icon-only `Button`s (including `TooltipTrigger` renders) take `aria-label`; `SelectTrigger`, `Switch`, `Checkbox`, `Slider` and inputs get a `Label`/`FieldLabel` or `aria-label`. Generic names live in web `common:a11y.*`. Mobile `Pressable`s set `accessibilityRole`, `accessibilityLabel`, `accessibilityState`.
- Native elements (`button`, `a`, `Link`) for anything clickable; a mouse-only wrapper around a keyboard-operable control is `role="presentation"`. Never nest interactive elements: put a `Link` in `Button`'s `render`.
- Every routed page has exactly one `h1` (`RouteAnnouncer` reads `#main-content h1`). Layouts render `SkipLink` and `<main id={MAIN_CONTENT_ID} tabIndex={-1}>`; never nest another `main`. Mobile headings use `accessibilityRole="header"`.
- Status changes without focus moving are announced via `role="status"` or toasts; errors `role="alert"`. Mobile: `accessibilityLiveRegion`/`announceForAccessibility`.
- Never convey state by color alone. Contrast 4.5:1 text, 3:1 meaningful icons/borders in both themes: status text uses `*-foreground` shades (web `text-success-foreground`, mobile `colors.successForeground`), never bare `success`/`warning` fills.
- Informative images get `alt` (cards: card name), decorative `alt=""`/`aria-hidden`; mobile `accessibilityLabel` or `accessible={false}`. Charts and canvases have a text alternative.
- Drag and drop, hover-only and gesture-only actions need a keyboard or single-tap alternative. Auto-close timers must be pausable or extendable.
- Respect reduced motion (`motion-reduce:` on custom animations); never block zoom or font scaling (`allowFontScaling={false}`/`maxFontSizeMultiplier` banned on mobile).

## Architecture

pnpm + Turborepo: `shared` (types, constants, zod schemas, rule engine, vision, serial protocol; no build), `server` (Hono 4, Drizzle, Postgres), `web` (React 19 SPA), `mobile` (Expo), `desktop` (Electron shell), `bot` (Discord), `api-docs` (Scalar), `shortener` (optional, :3003), `tutorials` (Playwright + Remotion, English only, never deployed). One root `.env`. The Vite proxy strips `/api`, so server routes have no `/api` prefix.

Neon scales to zero after ~5 idle minutes, so nothing may poll the DB on a timer: `/public/health` only runs `select 1` while the pool already holds connections; uptime monitors use `/public/version`.

### Auth & RLS

- `AUTH_PROVIDER` is `neon` (default) or `local` (`auth/index.ts`); route code never branches on it. Bearer tokens, never cookies.
- Org routes: `requireAuth` -> `requireOrg` (`X-Org-Id` adds `org_id` to claims) -> `requireRole`/`requireOrgRole`. SSE (`routes/stream.ts`) rebuilds the same claims; without `org_id` every `orgRls` table reads empty.
- User-scoped DB access goes through `authQuery(jwtClaims, tx => ...)` (switches to role `authenticated`; the app role has BYPASSRLS). Plain `db` only for intentional bypass (sync, webhooks, bootstrap, stats), so org filters stay in every query. New user/org tables use `.enableRLS()` + `crudPolicy` and need grants in `db/bootstrap-local.sql`.
- Hosted must run `auth.user_id()` in the same statement before `set_config('request.jwt.claims', ...)`: `pg_session_jwt` loading inside the membership check wipes the claims.
- Impersonation tokens carry the `impersonation_audit` guid as `jti`. Routes that create credentials or lasting access, change members or billing, or delete org data use `rejectAccountChangesWhileImpersonating`; scanning and hardware `rejectWhileImpersonating`.
- Never spread a request body into `.set()`/`.values()`: list fields explicitly (`pickCalibrationValues`).
- `ORG_SETTINGS_MANAGER_ONLY_KEYS` are owner/admin only: `PUT /org-settings` refuses a member only when one actually changes (clients resend whole drafts).
- Logs and error reports never carry query strings or SQL parameters (tokens travel in `?token=` and share links): see `lib/error-redaction.ts`; reports send `path` not `url`. Token-keyed caches register with `hasSecretKeys`.
- Staff routes: `requireRole(...PLATFORM_STAFF_ROLES)`; card sync, card database tools, plans and developer stay `requireRole("admin")`. Web gates with `useRole().isStaff`, `AdminGuard`, `adminOnly`.
- A 403 signs the web client out, so owner/admin checks on member-reachable pages are inline.
- Role/membership lookups are cached 10 s, then served stale up to one more TTL while refreshing: a revocation can last 20 s. Null results are never cached.
- No try/catch in route handlers: `app.onError` returns the JSON 500 (`/v1` has its own). Catch only to map a specific error.
- Own-auth (`local`): `getOwnAuth()` stays lazy (`createOwnAuth()` throws in production without `OWN_AUTH_TOKEN_PEPPER`). `LocalEmailProvider.send()` never throws; invite links are captured via `inviteCaptureStorage`. The first account on a fresh instance becomes platform admin. Password-reset responses stay generic.
- Web Neon calls go through nginx's same-origin `/neon-auth/` proxy (Safari blocks Neon's third-party cookies); the proxy strips `X-Forwarded-*`/`Forwarded` (Neon returns `INVALID_HOSTNAME`). `link-social` fails here (`state_mismatch`): providers are added only by signing in under the same email.
- A 401 retries once with a fresh token: web `fetchWithAuthRetry` (all `api*` helpers), Expo `apiRequest`. Raw `fetch` with `getAuthHeaders` doesn't retry.
- The active org lives in localStorage for both providers.

### Share links & public pages

- Collection (`/watch`) and storage location (`/shared/storage`) share links are HS256 JWTs (`lib/share-tokens.ts`), each a `share_links` row whose guid is the `jti`; revoked via the row or by bumping `monitor_link_version`/`share_link_version`. Tokens are signed deterministically from the row, so lists re-sign instead of storing tokens.
- Missing claims mean defaults: `prices` shown, `purpose` `view`, `contact` required, `account` not required. When prices are off, every public read and guest SSE goes through `pricesForShareLink`; never hide prices only in the UI.
- Lengths are admin platform settings enforced at verify time from `iat`, so shortening cuts live links; requested day counts are clamped, not rejected.
- Card share links (`/shared/card/<scan guid>`) never expire and are keyed by `collection_card_id` (survives the re-sort guid rewrite).
- Public card browsing (catalogs, watch, shared storage) is one page (`PublicCardBrowser`) over `createPublicCardBrowseRoute`: a link only resolves a `PublicCardBrowseScope`, never per-link card queries.
- Shop catalogs (`businessTools`) are never-expiring links reset via `shop_catalogs.share_link_version`; `is_public` catalogs open without a token. Prices follow `shows_prices`, not a claim.
- Share pages: nginx serves `share.html` with SSI from `/public/share-preview<path>`; set `SHARE_PREVIEW_API_URL` when `/api` routes straight to the API or previews silently fall back.
- OG images (`lib/open-graph-image.ts`, sharp): text is Figtree outlines via `opentype.js` (no system fonts), overflowing stats are dropped, card art only from `ALLOWED_IMAGE_HOSTS`. robots.txt keeps `Allow: /api/public/og-image/`.

### Short links

- Optional `shortener` package; on only with API `SHORT_LINK_BASE_URL`, else calls are no-ops. The API registers signed long paths (`lib/shortener-client.ts`) in the same transaction and re-registers live links at startup.
- Clients share only through shared `buildShareLinkUrl`/`buildShopCatalogLinkUrl`. `short_code` is stamped on every row even while off.
- `/s/` stays out of the PWA navigate fallback.
- Custom short links (`is_custom`, staff, web-only) are never touched by app registration (`WHERE NOT is_custom`) and never returned by `GET /public/short-link`.

### Trades

- Offers only on trade links. The guest is `X-Guest-Key` (stored hashed); wanted cards are snapshotted at send. Optional bearer via `optionalVerifiedUserId` (invalid means anonymous, never 401).
- Cross-org customer reads (`/trade-offers/outgoing`, `/card-reservations/mine`) use plain `db` filtered by the verified user id, guest-visible fields only, never prices.
- Offers end `accepted`/`declined` (no soft delete). Accepting removes wanted cards via `removeTradeOfferWantedCards` (immediately, or deferred to a pick list with `removeWantedCardsWhenPicked`).
- Owner review logic lives in shared `trade-offer-review.ts`; in-person trades in `lib/in-person-trades.ts` share `inPersonTradeBalance` between web and Expo.
- Cash counts in `offeredValue` only while its currency still matches the price source.
- The Expo scan tab is the only QR reader (`useScannerQrWatcher`), active only while the camera is open and not mid-scan.

### Other hosted features

- Match validation is hosted-only (not mounted with `AUTH_PROVIDER=local`).
- Stats sync: self-hosted instances push only daily scan counts to hosted (`/stats-sync`); synced counts never enter `scan_stats` or platform stats, leaderboards include them only with `includeSelfHosted=true`.
- What's new merges shared `RELEASE_FEATURE_HIGHLIGHTS` with staff `feature_highlights` (`lib/feature-highlight-selection.ts`). Uploaded media is `storage:<key>`, presigned on read; videos stay under nginx's 32 MB limit. Highlight text is i18n keys, so search is on-device.

### Public API & webhooks

- Defined once in `shared` (`schemas/public-api.schema.ts`, `PUBLIC_API_ENDPOINTS`); a new endpoint needs a registry entry, schemas and a handler in `routes/v1/index.ts`, then regenerate `openapi.json`.
- API-key queries run through `apiKeyQuery(orgId, ...)`; a `/v1` query on a new table needs a migration grant and an `api-service-policy-*` policy.
- `/v1` follows Scryfall conventions (`object`, snake_case, list envelope), not `{ success, data }`.
- `/public/*` has no per-IP limit (no proxy restores the client IP): share links are limited per token.
- Sync API keys (`mvsync_`) are platform-level; `/sync-api` checks `SYNC_API_KEY_PERMISSIONS`.
- `emit*Webhook` only enqueues; deliveries use `safeLookup` and no redirects. A new event needs `WEBHOOK_EVENTS`, an `emit*` in `lib/webhooks/events.ts` and translations.

### Cards (multi-TCG)

- One adapter per game in `server/src/lib/adapters/<game>/`, registered in `card-search/resolve.ts` and `lib/sync-job/sources.ts`, plus a `Game` row.
- `cards.data` is the source's raw card (read through `normalizeStored`), one entry per artwork, art through `toPortraitCardImage()`; every `cards.data` write also sets `collector_number`.
- Never hardcode source fields: read through the game's `fieldDefinitions` and `getByPath`/`getCardValue`; game-specific behaviour goes on the adapter (e.g. `rarePrintingSql`).
- TCGTracking (`lib/tcgtracking/`, English only) wraps sources in `TCGTRACKING_GAMES`: linked cards get `tcgtrackingProductId`, missing cards become `tcgp-<productId>` fallbacks, covered fallbacks get `supersededByCardId`.
- Double-faced cards need `SyncSourceCard.backImageUrl` (sync embeds `back_embedding`) and `PlayingCard.backImage`.
- Rules store field keys only; anything new that stores a field key goes in `lib/field-renames.ts`.
- Field definitions come from shared `buildFieldDefinition`; `boolean` always gets `BOOLEAN_FIELD_OPTIONS`. `getCardValue` normalizes booleans to `"true"`/`"false"`/null and dates to `YYYY-MM-DD`.
- Rules evaluate `toRuleCard(...)` with `withScanRuleFields`; never save a `$scan` card. Text comparisons are trimmed and lowercased.
- Per-game quirks (names, set codes, linking keys, `rarePrintingSql` choices) live in each adapter; read it before changing a game.
- Pokémon stamps are TCGdex variants inside one card (`PlayingCard.stamps`); a copy's `collection_cards.stamp` is priced on TCGplayer only. Only 1st Edition is detected (`detectCardStampRgba`).
- One Piece printed language code is detected structurally by shared `detectPrintedLanguageCode`, sent as `printedLanguageCode`; no template region (art misreads).

#### Finishes and foil

- Finishes come from the adapter (`PlayingCard.foilTypes`, `finishPrices`); `cardPriceFor` takes `{ isFoil, foilType }`. Never detect the foil pattern from the photo.
- `foilOnlyFoilType` forces foil on every save, so it comes only from catalog finish data, never a missing price.
- Look-based foil detection is only the shared sorter nudge (desktop web/Electron and Pi host), gated by `resolveScanFoilType`; forced and foil-only finishes stay authoritative. `executeScanFoilNudge` requires reported limits and safe calibrated travel.

#### Catalog sync and storage

- Catalog images are embedded portrait (`toPortraitCardImage` turns landscape 90° clockwise); a no-detection fallback crop is portrait too (`getDefaultCardDewarpContour`).
- Every embedding write stamps `CARD_EMBEDDING_VERSION`; bump it when normalization or embedding input changes.
- Sync plans through `planCardSync` and writes through `buildCatalogCardRow`; `cards.source_data_hash` sends only changed cards, so a new stored column derived from `data` joins the hash. `hasPartialData` stubs never overwrite a stored row.
- Pruning runs only after a complete fetch: a source that skips cards on errors calls `markSyncFetchIncomplete`; prunes over `SYNC_PRUNE_MAX_SHARE_OF_STORED_CARDS` are refused.
- Only sync calls upstream APIs; everything else reads `card-search/stored-cards.ts`, and an unsynced card is "not found".
- Nightly card sync runs on a GitHub runner (`card-catalog-sync.yml`), invisible to the server except via the 60 s signature check.
- `collection_cards.card` is a slim scan-time copy referencing `cards` by `(game, lang, card_id)`, not a foreign key. Write through `toSavedCardSnapshots`; every read returning cards goes through `hydrateSavedScans`/`hydrateSavedCards`.
- SQL over many collection rows reads generated `card_*` columns, never `cc.card ->> ...`; catalog fields come via `cardCatalogJoinSql`. Long lists page on the server.

#### Collection cards: import, export, filter

- CSV exports are built on the server (`lib/card-export.ts`); exports never call TCGTracking. Imports: shared `parseCollectionCsv` detects the format, `lib/collection-csv-import.ts` matches by id, then set plus number, then name.
- Moving cards between collections is same-game only, clears `bin_number`.
- Deck links (Moxfield, Archidekt) are fetched only by the server (`lib/deck-links/`, `POST /cards/deck-link`) and turned into CSV import rows, so they reuse the CSV preview and import; Moxfield's API refuses unapproved user agents (`failure: "unavailable"`).
- Dropped Scryfall/Moxfield/Archidekt cards and deck links are handled by the web `useExternalCardDrop` (desktop collection grid only); the keyboard alternatives are Add card and the import dialog's deck link field.
- Grids and storage lists filter through `CardFilters`/`cardFilterSql`; price filters use `scannedCardPriceSql`, so they throw without pricing.

### Prices

- `scripts/sync-prices.ts` is scheduled only (hosted: `price-sync.yml`). TCGplayer prices come from TCGTracking per set, refetched only when its modified markers change. `CARD_API_USER_AGENT` on every outgoing request.
- Every shown price is one stored record, never computed (no median, average or min across products, printings or finishes). A card resolving to several products gets no price (`onlyPriceRecord`). Missing prices are a dash (`MISSING_PRICE_TEXT`).
- Never read `card.price` for display or totals: use `cardPriceFor`/`formatPrice` (web `usePriceSource().priceOf`) or server `loadOrgPricing`. Currencies never mix.
- Below NM, TCGplayer uses the condition's SKU price when synced, else NM times the condition multiplier; SQL totals use multipliers only.
- Grids never sort by a game's own price fields: `cardSortableFields` adds `$price.usd`/`$price.eur`.
- `card_price_history` (cents, one row per card and UTC day, only changed rows) is written only by `refreshCardPrices`; clients fill gaps with `cardPriceHistorySeries`.
- `collection_cards.card` keeps its saved prices (`pricesAtScan`); never refresh prices inside it.

### Soft deletes

- Hard-deleted only: `collection_cards`, unmatched scan photos, `cards`, `webhook_endpoints`, whole-org purges, closed trade offers and reservations. Everything else sets `is_deleted`.
- Audit tables have no foreign keys: their rows are permanent.
- Every read, count, limit check and lookup filters `is_deleted = false` (including `with:` blocks and raw SQL). Uniqueness uses partial indexes on live rows; upserts set `isDeleted: false`.
- A new soft-deletable table needs the column, filtered reads, `DELETED_ITEM_TYPES` and `routes/admin/deleted-items-sources.ts`.

### Card matching

- Swapping the embedding model is a breaking migration. Matching is in-memory (`lib/card-match-index.ts`, brute-force cosine per game and lang, never SQL); `cardDistanceSql` only scores an explicit id list. A new SQL nearest-neighbour query needs its own index and `hnsw.iterative_scan`.
- Segments hold int8 embeddings and interned text: read rows via `cardIdOfRow`/`nameOfRow`/`setCodeOfRow`/`collectorNumberOfRow`.
- Loading uses `backgroundLoadDb` (own pool, intentional RLS bypass). A 60 s signature check reloads changed games; `refreshStoredData` sets `updated_at` so other processes notice.
- Snapshots (`lib/card-match-snapshots.ts`): bump `CARD_MATCH_SNAPSHOT_FORMAT_VERSION` when segment fields, quantization or interning change.
- Adapter match flags are stored on `cards` and refilled in the background when stale; sync never writes them, so every write to `data`, `set_code` or `card_id` must set `updated_at`.
- Regular printings beat promos and list reprints (`rarePrintingSql`, `regular-printing-preference.ts`): a promo never wins on image alone. A confident printing mark or explicit preferred set still wins.
- Sort by game: identify routes take `matchGameKeys` and keep the closest; a card from another game is only a sort-only scan, never saved.
- Identify requests go through shared `requestIdentifyWithRetries`; a `ScanIdentifyRequestError` never triggers the server-vectorize fallback.

### OCR and printed marks

- `scanOcrMode`: `when-unsure` reads text only after an unsure image match; `every-scan` always.
- OCR replaces the image match only when unsure or OCR confirms the printing (`prefersTextMatch`), never on an unconfirmed name; thresholds `UNCONFIRMED_TEXT_MATCH_MAX_DISTANCE_GAP`, `OCR_MATCH_MAX_IMAGE_DISTANCE`.
- Text and printed-number matching use the in-memory index; `lib/card-name-trigrams.ts` must stay score-identical to pg_trgm `similarity()`. Any SQL comparing a scan to `cards` adds `matchingExclusionFilter(scope)`.
- Server OCR is PaddleOCR on onnxruntime-node (`lib/paddle-ocr.ts`); the v5 recognizer needs input height 48; the small v3 detector is deliberate (v5 server is ~9x slower on a Pi).
- MTG's collector-line star is the only photo foil signal (`detectPrintedFoilMarkerRgba`, on the OCR-sized crop, never the 448 px embedding image); every save path passes it to `resolveScanFoilType`. PaddleOCR can't read it.
- Printing marks separate same-art printings (`PRINTING_REGIONS_BY_GAME_KEY`, adapter `printingMarkGroups`); clients sample them from the camera frame (`printingMarksPayload`), never the 448 px image. Changing an area, channel or grid bumps `PRINTING_MARK_VERSION`.

### Scan identification flow

- With both orientations on, search the last winning one first and skip the other only for a close match (`isConfidentOrientationMatch`).
- Early route (`runScanWorkflow` `routeEarly`, web and Pi host, not Expo): an unsure image match may route before its text read when every close candidate plans the same bin. Never with removal, duplicate checks, foil nudge, consensus or a prefetched host match. An early-routed scan is committed and flags `lowConfidenceMatch` if the final card belonged elsewhere.
- Control cards: `scanner-control-code.ts` owns the versioned `mault-control:` payload (unknown keys reject, so a new field bumps `SCANNER_CONTROL_CODE_VERSION` and goes in `SCANNER_CONTROL_CODE_PARAM_MIN_VERSIONS`; cards encode the lowest version they need). Never saved; the control card wins over early routes. Every adapter picks the card's bin through `resolveControlCardBinNumber` (batch separators follow the last scanned card's bin, everything else goes to the catch-all).
- The settle delay is an upper bound: web captures once `createCardSettleTracker` sees a still card; the Pi host uses `grabSettledCameraFrame`.
- Phone-as-camera images never ride the stream: they're uploaded to `POST .../phone-camera/captures/:requestId` (held 30 s) and fetched once.

### Web inference and memory

- An onnxruntime-web WASM `RuntimeError` or failed worker start is permanent for the page; never retry.
- Never use the Asyncify ORT build for WASM (iOS 26 Safari uses gigabytes compiling it, WebKit bug 304810); it's only for WebGPU models (`inference-webgpu.worker.ts`).
- Multithreading needs cross-origin isolation (COOP `same-origin` + COEP `credentialless`), so cross-origin iframes need `credentialless` and auth/checkout can't rely on popups. Threaded workers load ORT glue from its own file; the bundled copy hangs.
- The web detector runs on WASM (`alwaysRunOnCpu`) at the default optimization level; server and mobile keep `disabled` (onnxruntime-node 1.21 crashes in `GatherSliceToSplitFusion`).
- Mobile Safari reloads canvas-heavy tabs: reuse scratch canvases, free per-scan ones with `releaseCanvases`, warp on the CPU (`warpRgba`), never WebGL.
- Scan elapsed time is read through `useScanElapsedMs`, never the `useScannedCards()` context.

### Scan routing, bins and saves

- Web, mobile and Pi route through shared `resolveScanBin` (`scan-routing.ts`); corrected or hand-added cards use `resolveCorrectedScanBin`.
- Saves go through `PendingScanSavesProvider` over shared `PendingSaveQueue`, never directly. The Pi host keeps its own file-backed queue.
- Web starts the save with the route command and feeds on the route reply without waiting for the save (~2 s per card otherwise). The Pi host keeps confirmed route then save.
- Save transactions call `applyScanSaveTimeouts` first, so a locked save fails with a retryable 500.
- Re-sort presets (`is_resort_mode`) are applied by the server save (`lib/resort-scan.ts`); clients send ordinary saves.
- Bin capacity is the smallest of physical size, `chaosBinSize`, `maxCards` and the claimed location's free slots (`scanBinCapacity`).
- Fill lists: each bin has a stored claim (`bins.claimed_storage_location_id`), reassigned only by `reclaimFillLocations`, never recomputed by bin order. Slots are never reused; `location_position` is 1-based: never add 1.
- Cards moved to a location get slots in scan order, never client order.
- A batch separator control card is never stored itself: the adapter marks its bin, and the next card routed there saves `starts_storage_batch` (shared `ScanRoutingContext.startsStorageBatch`). `assignBinToLocation` numbers the stack through shared `planBinStackSlots`, skipping to a new storage batch at that card. Bin capacity counts those skipped slots: bin counts return `storageBatchStarts` (stack indices from the oldest card) and every adapter passes saved plus pending starts to `scanBinCapacity`.
- A card is in its bin while `bin_emptied_at` and `location_id` are both null (a manual move to a location takes it out; removing it from a location stamps `bin_emptied_at`); `markBinsEmptied` stamps cards, so presets hold no fill state.
- Never put a collection's full card list in a stream payload.
- Every connected sorter is a station (tab) plus one idle standby. Background stations stay laid out (never `display: none`) so they keep sorting.

### Review and unmatched scans

- Any correct, confirm or review accept sets `is_reviewed` and clears `low_confidence_match`; `is_corrected` stays separate.
- Unmatched scans become cards only through `lib/unmatched-promotion.ts`. Retry runs only on user-selected scans and saves matches with `low_confidence_match`.

### Collection reads, stats and caches

- Stats that must survive deletes read `scan_stats`/`org_daily_scan_usage`. Scan images go through `resolveScanImageUrl`.
- Scan photo downloads are rendered by the server (`lib/branded-scan-image.ts`) since presigned URLs lack CORS.
- Scan timeline buckets use the client's IANA zone: clients must send `deviceTimeZone()`.
- In-process server state (locks, leases, sorter links, rate limits, machine status) is per process.
- Every in-memory read cache registers with `lib/cache-registry.ts` (the `create*Cache` helpers do it; hand-rolled `Map`s call `registerMapCache`).
- Repeated org reads use `createOrgReadCache`: keys carry every input; per-role filtering runs after.
- `requireOrg` bumps the org data generation after every non-GET unless `markRequestAsReadOnly`; writers outside `requireOrg` call `invalidateOrgReadCaches`. `invalidateOrgCardReadCaches` spares `isUnaffectedByCardWrites` caches; new caches are card-dependent unless no card save can change them.
- Heavy card stats are stored snapshots (`lib/stored-snapshots.ts`, `collection_card_stats`, `org_card_stats`) marked dirty by triggers: a new column those stats read joins the trigger comparison.
- Single statements issued while a transaction may be open use `singleStatementDb`, never `db`. A request holds at most one pooled connection: run cached aggregates before or after its transaction, never in parallel.

### Plans and machine status

- Plan features/limits: a `shared` key (`PLAN_FEATURE_KEYS`/`PLAN_LIMIT_KEYS`) plus its check, applied on create/enable only. Exceptions: `membersPerOrg` on every request (402 `member_seat_limit`, never 403); `organizations` is client-side. `businessTools` is "Buy and sell" in copy.
- Admins preview tiers with `X-Plan-Preview`, so plan checks go through `plan-config`, never `org_billing.plan`.
- Read prices via `findPlanPriceId`, never env vars. The webhook derives the plan from the price ID. The API overwrites the portal's default config per process, so dashboard portal settings don't stick.
- `org_billing` is written only by `syncOrgBillingFromStripe`.
- `POST /machines/:id/commands` relays to the station tab unless the Pi host runs in process, so a remote stop is never a safety stop.

### Firmware & serial

- Protocol: `firmware/PROTOCOL.md`. Firmware has no bins; the app maps bin -> (module, direction).
- One command at a time; every blocking wait goes through `waitMs()`; pusher moves through `setServoPosition()`.
- `{"stop": true}` is the only command accepted mid-command; send it through `SerialSession.sendEmergencyStop` and treat `{"error":"stopped"}` as a terminal stop, never a routing or feed failure.
- Route and feed replies go through shared `classifyRouteReply`/`classifyFeedReply`; never re-implement the reply ladder per app.
- `handleCommand` parses its line as `const char*` and prints replies directly. New `ModuleConfig`/`FeederConfig` fields go in `MODULE_FIELDS`/`FEEDER_FIELDS`; changing `ModuleConfig` needs an EEPROM layout migration.
- A function whose signature uses a sketch-defined struct needs a manual prototype right after the struct.
- Feeds go through shared `feedWithRetries`, which resends only on a timeout, never on an empty hopper.
- Firmware `route` feeds first when module 1 reads empty, so scan routes pass `requireLoadedCard` or they sort an unscanned card.
- A `feedNext` route feeds only after the routed card reaches its target (feeding while it fell jammed it between modules 1 and 2). Routes to module 1 never pipeline (`routeAllowsPipelinedFeed`).
- `feeder` succeeds at once while a card sits in module 1, so feeds after a routed card go through `feedNextCardAfterRoutedCard`.
- Minimum-firmware features go in `FIRMWARE_FEATURE_MIN_VERSIONS` with a gate and a fallback; Pi controller versions in `PI_CONTROLLER_VERSIONS` (unknown `pi-` versions support nothing).
- The foil nudge needs `pusherNudgeMaxPulse`/`pusherNudgeMaxTravelPercent` from firmware status (without them never nudge) and runs through `SerialSession.runWhenIdle`.
- ESP32-S3 boards reboot when a USB port opens and their boot banner can answer the first `getStatus`, so identify asks again. Builds pin `FlashMode=dio`, `PartitionScheme=min_spiffs`; `esp32-flasher.ts` writes around NVS, never whole at 0.
- Replies match by `seq`: use `sendRequest`/`sendRawCommand`.
- Pusher directions are mirrored (`"left"` lands right); render through `BIN_SLOTS_PHYSICAL_ORDER`, never change routes to fix the display.
- Serial controls require `useSerial().isReady`; hardware-editing pages use `SessionLock`.
- `requestPort`/`requestDevice` must be the first await in the click handler.
- Wi-Fi remote: the relay is in process, so board and browser must reach the same server process; Wi-Fi is configured only over USB/BLE; never flash over `cloud`; never start Wi-Fi from `setup()`. Gate on `useSerial().hasWifi`, not board type. Uno R4 WiFi: Wi-Fi and BLE share the co-processor, one per boot; no joins or TLS handshakes while a command runs.
- Changing `BIN_HEIGHT_PRESETS` needs a data migration. The 3D model maps raw pulses (never percentages) to degrees.

### Mobile app (`packages/mobile`)

- Captured photos go through `resizeAsync` before reading pixels (iOS orientation).
- Camera screens mount the `Camera` only through `useCameraMountReady` and unmount on blur: tearing a session down mid-configuration crashes natively. Keep `patches/react-native-vision-camera@5.2.3.patch` (upstream PR #4215) until a release includes it.
- Torch through `useCameraTorch` (re-applied on `onStarted`).
- Live frames go through `useLiveFrameSource` (`takeSnapshot()` throws on iOS).
- The app is hand-scan first: it scans into a phone-local target and never calls `set-active`.
- Loading is skeletons or `LoadingLogo`, never `ActivityIndicator`. iOS buttons get their disabled look from SwiftUI alone (extra RN opacity makes labels unreadable).
- Bottom sheets go through `Sheet`; iOS can't present a sheet while another animates away (`useQueuedSheetPresentation`). Drawer-like routes are native `formSheet`s (`SHEET_ROUTE_PATTERN`); Android form sheets can't host a pushed page.
- iOS form sheets: `sheetOptions` adds `bottom: 0`, sheet screens keep their root `View` `collapsable={false}`, actions go in `PinnedActionsLayout`'s bottom bar, never a `KeyboardAvoidingView` root.
- Settings pages render through `SettingsPage` (native sections, draft `SaveBar`).
- Toasts through `useToast` are hidden under an open native sheet: close the sheet first. Reversible actions use an Undo toast; irreversible ones keep their alert.
- `collection_cards` are hard-deleted, so `useDeferredCardRemoval` hides cards in caches and deletes when the toast expires.
- A failed load with no data renders `QueryErrorState`, never defaults or an empty list.
- ONNX runs on the CPU provider only so embeddings match web and server. ORT versions are exact pins (web 1.30.0, Expo iOS/Android 1.30.0, node 1.31.1): change one deliberately and check embeddings still match.
- iOS takes ONNX Runtime from our own mirror (`plugins/onnxruntime-c-mirror.json`); to change versions run `node scripts/mirror-onnxruntime-ios.mjs <version>`.
- `PageHeader` `options` must stay referentially stable (a new object loops `setOptions`).
- Sorters connect over BLE or the Wi-Fi relay, never USB. Android needs `ensureBlePermissions` first.
- iOS widgets (`expo-widgets`): the `"widget"` layout runs in the extension and can reference only `@expo/ui` components, modifiers and `PlatformColor`, with pre-translated strings; shared layouts are imported by relative path. Keep system margins and flexible frames, never fixed heights.
- Expo social sign-in relies on nginx redirects to `MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL` (hardcoded in `nginx.conf`, keep in step); it must be a server redirect (Android Custom Tabs).
- No in-app account creation (App Store would then require in-app deletion).
- Admin is native for staff; hardware, developer and impersonation stay web-only.

### Shared client conventions (web + Expo)

- Web matches the Expo app's structure: `/app/home` is the post-login landing; Library holds collections, storage and trade offers.
- Global search ranking lives in shared `global-search.ts`; catalog results load one query per game.
- `matchesEnglishCardNameSql`'s `IN (subquery)` must never share an `OR` with indexed matches (forces a sequential scan): add it as its own `UNION ALL` branch restricted to `lang = ANY` the game's non-English languages.
- Collection card searches default to the collection's language (`cardSearchLanguageOrCollectionDefault`; `lang=all` searches every language).
- Screens never render an empty form or list while loading: use a skeleton shaped like the loaded screen.
- Numbers use tabular figures by default. Counts and money in tight spots go through shared `formatCompactNumber`/`formatCompactPriceInCurrency`, never `notation: "compact"` (German has no short thousands).
- Card art: web `CardImage`, Expo `CardArt`/`CardThumbnail`; never a bare `img`/`Image`.
- Edits update caches first and roll back on failure. Web user-initiated card removal goes through `removeCardsWithUndo`.

### Desktop (`packages/desktop`)

- Loads the hosted web app, never a bundled copy; the web app talks to it only through the feature-detected `window.maultDesktop` bridge (`DesktopBridge` in `shared`, methods optional for older shells).
- Build channel `MAULT_DESKTOP_CHANNEL` is baked in by tsup and read by `electron-builder.config.js`; keep the two configs' channel lists in step.
- Publishing identity is never committed (`MAULT_DESKTOP_APP_ID`, mobile bundle ids, `EAS_PROJECT_ID`, gitignored `packages/mobile/eas.json`).
- Thumbnail buttons: no calls until shortly after the main window is first shown, and never pass `flags: ["enabled"]`.
- The web `AppTopBar` is the drag region; its buttons, links and inputs stay `no-drag`.
- Serial permissions only allow ports picked through `device-picker.ts`; the permission handler receives Chromium's snake_case object.
- `backgroundThrottling: false` hides occlusion from the page, so "covered or minimized" comes from `window-state.ts`/`window-coverage.ts`.
- Document scanners (Windows): `scanner-helper/` on NAPS2.Sdk (LGPL: ship its DLLs unbundled, never single-file), WIA only through WIA 1.0 mode (NAPS2 TWAIN transfers the whole hopper). The renderer never passes paths.
- Scanner pages: never perspective-dewarp or crop by brightness thresholds (light borders read as background); see `drawScanPageCardRegion`, `straightCardCropOnPage`. Flatbeds scan the full glass width, never a card-sized area.

### Business tools

- `/business` routes go through `businessQuery`; permission failures return 200 with `success: false`, never 403.
- Every path that inserts `collection_cards` stamps `intake_lot_id` via `findOpenIntakeLotId`. Cards in open or cancelled lots aren't inventory (`inventoryCardSql`).
- Write costs through `updateAcquisitionCosts`. Fulfilling an order hard-deletes its cards and writes permanent `card_sales`.
- Cards allocated to open picks or held by reservations are hidden from trade links, trade offers and pick allocation (`lib/order-reservations.ts`, `notHeldByCardReservationsSql`); view links still show them.
- Pick progress is server state (`PUT /business/orders/:guid/picked`).
- Sorter alerts go through `raiseDeviceAlert`. Audit-worthy mutations call `logActivity(tx, ...)` in the same transaction; a new action needs `ACTIVITY_ACTIONS`, `ACTIVITY_ACTION_KEYS` and translations.
- Card reservations (`lib/card-reservations.ts`): one queue per `collection_card_id`, a single `ready` holder. Nothing runs on a timer: every read and write first settles lapsed holds (`settleCardReservations`) under a per-org advisory lock. Fulfilling a pick never sells a reserved card; the sale is recorded at pickup.
- Customer lists stay live via `lib/customer-stream.ts`, which sends `my_*_changed` only to customers whose own visible state changed.

### Pi scanning

- The Pi scan session never imports `db`, routes or server-only state: it goes through `piScanApi()` (`lib/pi-scan/existing-routes.ts`), in process (`local-api.ts`) or to mault.xyz (`remote-api.ts`, `/pi-link/device/api/*`). Session-only work (context, matching, OCR, control-card targets, host locks, events) lives in the unmounted `/scan-host` router, reached only through `requestAsScanActor`; the hosted proxy accepts only `PI_LINK_ALLOWED_ROUTES` as `pi_hosts.active_scan_user_id`, so a new session call needs a `/scan-host` route or an allowlist entry.
- Linked Pis (hosted mode, in progress; memory `project_pi_hosted_mode`): pair through `POST /public/pi-link/pairings` (poll secret in `X-Pi-Pairing-Secret`, never the query), an owner/admin claims at `POST /pi-hosts/claim`, and the next poll receives the `mvpi_` token once (only `pi_hosts.token_hash` is stored). Pairings and token lookups use plain `db` (`pi_host_pairings` has no policies); the Pi authenticates with `requirePiHostToken`. Every plan can link; scans use the org's normal limits.
- Linked Pi control: with `MAULT_LINK_URL` in the Pi's `.env`, `run-api.sh` starts `dist/pi-link.js` (`src/pi-link-main.ts`) instead of the API: no Postgres or migrations, price sync skipped. The Pi pairs (code at `GET /pi-link/local` and in the log), stores its token in the Mault state dir (`pi-link.json`), switches `piScanApi()` to the remote API and keeps an outgoing command WebSocket (`/pi-link/device/commands`). Members drive it through `/pi-hosts/:guid/scan-session`, which sets `active_scan_user_id` only when no scan is running and restores it if the start fails; the Pi clears it with `ended` or a first `state` with `sessionActive: false`. Local `/scan-session` and relayed commands share `runPiScanAction`.
- `pi-link-main.ts` must never import `db`, `auth` or app routes (`pi-link-runtime.test.ts` walks its imports): pass DB-backed facts in from the full server (e.g. `startPiUpdate(activeScanSessions)`). `piScanApi()` has no default; `index.ts` sets `localPiScanApi`.
- Hosting choice: `.env` `MAULT_HOSTING=hosted|self` (written by `install-mode.py`, hosted also writes `MAULT_LINK_URL`). Existing installs (`setup-complete` marker or `--migrate-from`) default to self and are never switched implicitly; SD image first boot reads `hosting=` via root `boot-config.py --print-hosting` (missing means hosted). Hosted setup disables Postgres and the price timer but keeps both installed; switch with `sudo mault hosting`.
- Linked Pis in the apps: hosted-only settings section `raspberry-pis` (web `features/raspberry-pis`, Expo `settings/raspberry-pis` + `raspberry-pi-link` sheet). Live state comes only from the relay's `PI_HOST_STATUS_EVENT` (listed in `ORG_EVENTS_WITHOUT_DATA_CHANGES`, or every Pi state push flushes org read caches) and `GET /pi-hosts` merges it in memory: never poll. Control rules live in shared `piHostScanControls`.
- Linked Pi camera: viewers open `/pi-hosts/:guid/camera` (WebSocket, `?token=&orgId=`); the relay asks the Pi for frames only while someone watches, and the Pi sends sharp-downscaled JPEGs as base64 over the command socket. Linked Pi sorter: the Pi registers its sorter as a sorter-link device (`POST /pi-link/device/sorter-link`) and bridges relay lines to the port (`sorter-bridge.ts`), so calibration uses the ordinary cloud transport; the bridge claims the port only on use, releases it before a scan starts and answers `busy` during scans.
- Linked Pi safety rules: `/api/pi-link/local` (pairing code) is loopback-only in `nginx-mault.conf`; a Pi is bound to the first sorter id it registers (`pi_hosts.sorter_hardware_id`, reset by re-linking); scan starts are serialized per Pi (`beginPiHostScanStart`); the relay releases a Pi's host-held collection lock when it returns without a session or stays offline 10 minutes; camera viewers are closed every 10 minutes with `PI_HOST_CAMERA_CLOSE_REFRESH` so they re-authenticate; frames are dropped, never queued, when a socket is backed up; every WebSocket route shares `WEBSOCKET_MAX_MESSAGE_BYTES`.
- Pi saves persist under the Mault state directory before API submission; internal route calls use `SERVER_SCAN_ACTOR` and still run membership/RLS/plan checks, never persisted bearer tokens.
- The GPIO controller starts without a PCA9685 (or I2C bus) and reports `servoDriver: "missing"`; driver setup runs lazily and again after a power loss (MODE1 sleep bit), so never initialize it unconditionally at startup.
- `PI_SORTER=1` selects the built-in GPIO/I2C controller (one station, other connections blocked); USB stays on `/pi-serial` with exclusive per-port claims (`lib/pi-serial-port.ts`). A missing selection never falls back to another device. One host session per org.
- Automatic browser attachment must never move servos or run the self-test.
- Host Bluetooth uses BlueZ/Bleak through the system Python helper; keep NUS UUIDs in shared.
- The API listens on loopback on Pi; remote clients go through nginx (`scripts/pi/nginx-mault.conf`). `piHost` is true when `PI_HOST=1` or the device-tree model is a Raspberry Pi; `PI_HOST=0` forces it off.
- The camera helper (`scripts/pi/camera-ctl.py`, `127.0.0.1:8765`) is exposed only through the authenticated `/api/pi-camera`; the web server must not proxy to it directly. Frames are re-encoded to JFIF.
- Camera calibration previews never persist: Discard/unmount restores the saved camera and focus; await restoration before leaving.
- UVC focus readback can lie: force manual writes through an adjacent value and reapply after a startup settle.
- Host prefetch may run side-effect-free `matchFrame` early, used only while `piMatchInputsKey` is unchanged; QR commands, removal, foil nudge and disposition never run speculatively.
- Host scans keep their collection lock across browser releases; only host cleanup releases it.
- Browser-mode vectorizing (`vectorizeOn: "browser"`) is offered only with `piHost`; `crypto.subtle` is missing on plain HTTP, so hashing falls back to `fast-sha256`.
- Installs are prebuilt release bundles (`scripts/pi/build-bundle.sh`, `pi-release.yml`), never a git checkout or on-device build. Releases unpack to `/opt/mault/releases/<version>` with `current` pointing at the running one; mutable state lives in `/var/lib/mault`. A release is never modified in place.
- Services are systemd user units of `mault-service`, rendered through `scripts/pi/install-services.mjs`; never copy the templates directly.
- Root only runs root-owned code: `/opt/mault` is root-owned and read-only to the service; root state lives in `/var/lib/mault-system`; root never writes, chowns or executes anything under `/var/lib/mault`. Root helpers are copied into `/usr/local/lib/mault`, never symlinked into a release, and release code runs as root only after `trusted-tree.py` passes. Root scripts pin `PATH` and call Python with `-I`.
- The API triggers updates only by dropping an empty file in `/var/lib/mault-system/requests/`; root `mault-update.path` does the rest. Updates refuse active scans, motion, sorter connections and sync jobs. Host update availability offers the manifest version whenever it differs (never only when higher), so rollbacks move boards back.
- Images get login, SSH and Wi-Fi from boot-partition `mault-config.txt` (`boot-config.py`); OS patching is `unattended-upgrades`, never auto-rebooting.

### Discord bot

- Each guild maps to one org; every channel and rule target is validated against the linked guild, and mentions are limited to the requested roles.
- Scan notification images are rendered by the server (`lib/discord/scan-notification-image.ts`), not the bot.
- `discord_user_links` is server-only (plain `db`, filtered by the verified `userId`).
- Customer status DMs send only when `BOT_URL`/`BOT_API_SECRET` are set; each change is claimed once in SQL, only for changes after the switch was turned on.
- Welcome DMs go only to `DISCORD_WELCOME_GUILD_IDS`; the privileged `GuildMembers` intent is requested only when that list is set.

### Deploys

- `deploy.yml` builds GHCR images; Coolify pulls `:latest` (master) or `:dev`. Files the plan stage changes reach later stages only through the `release-overlay` artifact, so never change build inputs in a later stage.
- Anything that changes a baked-in file (e.g. firmware) must dispatch `deploy.yml`. The web image rebuilds only when its change filter matches: add any new file the image copies to that filter. A new file the Pi bundle copies goes in `BUNDLE_SOURCES` in `pi-release.yml`.
- Web `VITE_*` config is runtime: read it through `runtimeEnv()`, never `import.meta.env.VITE_*`.
- The bundled firmware version is read from `firmware/main/main.ino` `FIRMWARE_VERSION` by the server and served via `/public/version`.
- Better Stack monitors are owned by `scripts/better-stack-uptime.mjs` (`pnpm uptime:sync`); monitored endpoints never touch the database.
- Release with `deploy_to_coolify` off tags the work released, so the nightly run won't deploy it: bring hosted up with a forced deploy, never a rollback to that tag (rollbacks skip migrations).
- Every release workflow takes a `rollback_tag`. Desktop, firmware and mobile rebuild the tag under the next version (updaters and stores never take a lower one).
- `mobile-release.yml` only builds; the mobile version is bumped by hand and store submission is manual.

## Web conventions

- Feature-first: `features/<name>/{api,components,lib}`; cross-feature code in top-level `components/`, `hooks/`, `lib/`. API calls through `lib/api/client.ts` or `features/*/api/`.
- Forms: React Hook Form + Zod resolver, never `useState` per field. Schemas for forms both apps have live in `shared`; messages are `formValidationMessage(...)` keys, never literal English.
- Nothing auto-saves: settings edit a draft saved through the page's single `SaveBar` with `UnsavedChangesGuard`. Draft forms take server data via `values` with `resetOptions: { keepDirtyValues: true }`; Discard passes `DISCARD_RESET_OPTIONS`.
- Hotkeys only through `useHotkeys`, declared in `HOTKEYS`. Toasts only through the root `Toaster`.
- Global search is a command palette (`GlobalSearchCommand`, opened through `openGlobalSearch()`), not a page.
- Settings sub-pages use `SETTINGS_PATHS`, `SettingsSection` panels and a `settings:sectionIntros` entry; moving a panel means updating `CALIBRATION_TOUR_STEPS`.
- Every `ui/dialog` `Dialog` is a vaul drawer below `md`: a dialog containing a combobox or popover passes `drawerOnMobile={false}`. An `overflow-hidden` child of a height-capped flex column needs `shrink-0`.
- Bulk-selectable items spread `modifierClickSelectHandlers` (Ctrl/Cmd-click toggles selection).
- Card actions belong in `useCardActions`.
- The app stream (`lib/app-stream.tsx`) is one shared EventSource: subscribe with `addEventListener`, never `onerror`/`onopen`.
- localStorage access can throw: always guard it.
- A new tour or first-run prompt's "seen" key also goes in tutorials `TUTORIAL_PRESEEDED_LOCAL_STORAGE`.
- Only `common` i18n loads at startup; a route using a namespace in `ROUTE_LOADED_NAMESPACES` wraps its loader in `withNamespaces()`.
- Route components use `lazyRoute`; links never preload route chunks. The service worker registers from the app layout, never `main.tsx`.
- First paint on `/app/home`: queries Home doesn't show wait for `useSecondaryRequestsEnabled()`.
- `/overview` and `/overview/widgets` never poll.
- Code loaded by `vite.config.ts` imports `shared` by relative path, never `@magic-vault/shared` (`ERR_MODULE_NOT_FOUND`). Type-only imports are fine.
- `shared`'s `sideEffects` lists only `schemas/public-api.schema.ts`; a new shared module with import-time effects must be added.
- Public marketing pages render outside the app's `QueryClientProvider`.

### Presets

- The UI calls a `bin_sets` row a "preset", never a "set". Presets carry only their game's `guid`, `key` and `name`: read field definitions from the collection's game or `/games`.
- Alphabet sort passes come from shared `planAlphabetPasses`.
- Multi-stage presets are `preset_workflows` with ordered steps referencing ordinary presets; activating a preset directly deactivates the game's workflows.

### UI style

- Borders: `--border` for structural lines (never `border-foreground/N` tints); `--input` only for control boundaries. Translucent control fills are `bg-border/N`, never `bg-input/N`.
- Status colors only from theme tokens; raw palette colors are for data only. Fix tokens rather than hand-patching dark-mode text.
- `ui/table` `Table` draws its own frame; never wrap it in another card.
- In-page notes `Callout`, full-width bars `AlertBanner`, empty lists `EmptyState`, sliders `SliderField`, progress `ui/progress`, icon wells `IconBadge`. Spinners only for in-progress actions. Foil badges use `FOIL_GRADIENT_CLASS`. Never add `dark:text-sidebar-primary` to `text-primary`.
- Text: `text-sm` body, `text-control` for controls and dialog bodies, `text-xs` secondary, `text-2xs` captions, no `text-[Npx]`, no per-component `max-md:text-*`. Secondary text is `text-foreground/70`; `text-muted-foreground` only in `components/ui` primitives and placeholders.
- Buttons: heights from the primitives' sizes, never `h-*`/`text-*` classes; `sm`/`xs` only inside inputs. Side-by-side buttons sit `gap-1.5` apart.
- Fills must read on the gray canvas and white cards: `bg-foreground/6` for secondary, ghost hover, segmented tracks and inset wells; `bg-muted` only for image placeholders.
- Radius: `rounded-card` cards and panels, `rounded-xl` overlays, `rounded-lg` other containers and controls, `rounded-md` menu items, `rounded-sm` tiny bits and status badges, `rounded-full` avatars; never plain `rounded`.
- Floating surfaces `shadow-popover ring-1 ring-border`; cards borderless `bg-card rounded-card` on the gray canvas; selected rows use the `selected` button variant.
- The shell gradient (`SHELL_GRADIENT_CLASS`) stays at `primary/10` or below in light mode so `text-foreground/70` keeps 4.5:1.
- The Expo app uses native controls (Compose in base files, SwiftUI in `*.ios.tsx`), not the web look; radii from `theme.ts` by role. `SwitchRow` toggles from the whole row (an RN `Switch` inside a SwiftUI sheet can't be reached).
- Desktop page headers use `PageHeader`; view switches `ViewTabs` (Expo `TabStrip`); toggles in forms `ResponsiveSegmented` (Expo `SegmentedControl`).
- Desktop is denser than phones: new layouts add an `md:` step instead of desktop-sized spacing.
- Icons in shadcn primitives take no `size-*` class.
- Motion: short `animate-in` for new content only, with `motion-reduce:animate-none`. No route transitions.

## Code style

- YAGNI, DRY after the second duplication, fail fast, simple first, delete aggressively.
- Verbose, self-documenting names (`waitUntilScanIsSaved: true`, not `wait: true`).
- No code comments in app code (firmware sketches keep theirs); record non-obvious things here instead. No `eslint-disable`.
- Types, interfaces and constants never live in component, hook or route files: `lib/interfaces/*` and `lib/constants/*`, shared ones in `shared`.
- Never use em dashes anywhere (code, copy in every locale, commits, chat).
