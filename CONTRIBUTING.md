# Contributing to Mault

Thanks for taking a look at contributing. This covers the dev workflow
for the four workspace packages (`shared`, `server`, `web`, `bot`) and, in
particular, how to make and ship a database change safely.

## Getting set up

Follow the [Getting started](README.md#getting-started) and
[Setting up Neon](README.md#setting-up-neon) sections in the README
first — you'll need a Neon project (Postgres + pgvector + Neon Auth) and
a filled-in `.env` before anything here will run.

```bash
pnpm install
pnpm dev        # turbo dev: Vite on :5173, Hono on :3001, in parallel
```

You can also run a single package's dev server with `--filter`:

```bash
pnpm --filter @magic-vault/server dev
pnpm --filter @magic-vault/web dev
```

## Project layout

```
packages/
├── shared/   @magic-vault/shared - types, constants, evaluate-bin rule engine
├── server/   @magic-vault/server - Hono API, Drizzle schema/db, auth middleware
├── web/      @magic-vault/web    - React SPA (scanner, bins, collections, admin, build guide)
└── bot/      @magic-vault/bot    - Discord bot (slash commands)
firmware/      Firmware sketch + wire protocol (firmware/PROTOCOL.md)
drizzle/      Generated SQL migrations (see Database changes below)
```

Branch off `master` and open pull requests against `master`.

## Shared scanning features and Pi host

Scanning runs in the web app, native mobile app and a headless Pi host.
In `piHost` mode, the API process owns the camera and sorter and continues
scanning after a browser closes. The web app controls and observes that
session. A decision implemented only in a React hook will not run on the
headless host, even when camera and serial tunnels are available.

Keep applicable scan decisions in `packages/shared` and platform effects
in adapters. Use the existing implementation points:

| Responsibility | Implementation |
| --- | --- |
| Control-card, removal, duplicate and foil workflow ordering | `packages/shared/src/scan-workflow.ts`, `runScanWorkflow` |
| Route, save and completion stages | `runScanDisposition` in the same file |
| Matched/unmatched routing plans, save mode and completion decisions | `packages/shared/src/scan-plan.ts` and its shared helpers |
| Identification, OCR selection and consensus policy | `packages/shared/src/scan-identify.ts` |
| Browser camera, UI and adapter effects | `packages/web/src/features/scanner/` |
| Native capture, UI and adapter effects | `packages/mobile/src/features/scanner/` |
| Headless session, host inference and hardware effects | `packages/server/src/lib/pi-scan/`; built-in GPIO transport in `scripts/pi/controller/` |

For example, a feature that pauses for a particular card condition should
pass the setting and card data into a shared decision. Each adapter then
handles the pause and reports its state. The browser renders the prompt;
the host holds its session and publishes state that another browser can
observe on reconnect. The condition has one implementation.

For every scan feature or behavior change:

1. Assess web, mobile web, native mobile and headless `piHost`. Distinguish
   shared behavior from UI presentation and hardware capability.
2. Extend the shared workflow, plan or helper that owns the decision.
   Keep DOM, React, Node, camera and transport APIs out of `packages/shared`.
   Add adapter capabilities when platform effects are needed; do not copy
   a browser algorithm into the Pi session.
3. Carry new settings, defaults and inputs through shared types/schemas,
   persistence and each applicable runtime's scan context. A browser form
   alone does not configure the host. Define when a running session adopts
   the setting and check that reconnecting clients retain host state.
4. Keep host execution independent of an open browser. Publish required
   session state through the existing org-scoped snapshots/events and
   preserve authentication, hardware ownership and route/save ordering.
   Explicitly describe effects that require an observing browser, such as
   browser audio playback.
5. Add or update meaningful tests for the shared decision and affected
   adapters. Cover headless execution, settings propagation, pause/stop
   and reconnect where affected. When transport or motion changes, assess
   both USB serial and `PI_SORTER=1` GPIO control. Shared workflow/plan tests
   live in `packages/server/tests/`, alongside Pi adapter tests; web adapter
   tests live beside their implementation. Run the relevant checks from
   the repository commands in `CLAUDE.md` and report hardware tests separately.
6. State which runtimes changed, are unaffected or remain unsupported, with
   the reason and validation performed. A platform-specific driver or new
   hardware capability may need an adapter; document the gap explicitly.

Ordinary UI and API features should continue to work through the existing
web app and shared server routes. This checklist is a development and review
requirement, not an automatic guarantee of future parity. Changes to shared
source still require updating and rebuilding deployed applications.

## `packages/shared`

Framework-agnostic types, constants, and the `evaluate-bin` rule engine
used by both the server and the web app. It has no build step of its own
— both other packages resolve `@magic-vault/shared` straight to
`src/index.ts` via the pnpm workspace link, so a change here is picked
up immediately by whichever dev server you have running, no rebuild
needed.

Keep this package free of server-only (Node/Drizzle) or web-only
(React/DOM) dependencies — anything that needs those belongs in `server`
or `web` instead, even if it feels shared in spirit.

## `packages/server`

Hono 4 API. Each resource gets its own route file in `src/routes/`
(`bins.ts`, `collections.ts`, `feeder.ts`, etc.), registered in
`src/index.ts` **without** an `/api` prefix — the web app's Vite dev
proxy adds that prefix and strips it back off before forwarding, so
routes should assume they're mounted at the bare resource path
(`/collections`, not `/api/collections`).

Auth/RLS: `db` (from `src/db/index.ts`) is a plain connection — use
`authQuery(jwtClaims, tx => ...)` for anything scoped to the calling
user/org, which sets the RLS JWT claims and switches to the
`authenticated` Postgres role for that transaction. Use the plain `db`
export directly only for operations that intentionally bypass RLS
(background jobs, webhook lookups, etc.).

There's no `lint` script for this package — rely on your editor's
TypeScript diagnostics, and make sure `pnpm --filter @magic-vault/server build` (tsup) still succeeds before opening a PR.

## `packages/web`

React 19 + Vite + React Router v7, structured feature-first
(Bulletproof React style): each feature under `src/features/<name>/`
owns its own `api/`, `components/`, and `lib/` subfolders. Only
genuinely cross-feature code belongs in the top-level `components/`,
`hooks/`, or `lib/` directories. Import via the `@/*` alias
(`@/features/...`, `@/lib/...`), not relative paths that climb out of a
feature folder.

Any form should use React Hook Form + a Zod resolver
(`useForm` + `zodResolver`) — avoid hand-rolled `useState`-per-field
forms.

```bash
pnpm --filter @magic-vault/web lint    # eslint
pnpm --filter @magic-vault/web build   # tsc -b && vite build - also the source of truth for type errors
```

## `packages/bot`

Discord bot (discord.js). It's a client of `packages/server`'s HTTP API,
authenticated with a shared `BOT_API_SECRET` header instead of a user JWT —
it never imports Drizzle or touches Postgres directly, and its own commands
live in `src/commands/`. The bot-facing endpoints it calls live in
`packages/server/src/routes/bot.ts`, gated by the `requireBotSecret`
middleware; adding a new slash command usually means adding both a route
there and a command file here.

There's no `lint` script here either — same as `server`, rely on your
editor's TypeScript diagnostics and `pnpm --filter @magic-vault/bot build`.

## Database changes

Schema changes need a migration — **don't hand-edit anything under
`drizzle/`**, it's generated output.

1. Edit `packages/server/src/db/schema.ts`. New tables that hold
   user/org data should follow the existing pattern of `.enableRLS()`
   plus a `crudPolicy({ role: authenticatedRole, ... })` entry, mirroring
   a neighboring table rather than inventing a new access pattern.
2. Generate the migration from your schema diff:
   ```bash
   pnpm --filter @magic-vault/server db:generate
   ```
   This writes a new numbered `.sql` file (and updates
   `drizzle/meta/_journal.json` + a matching snapshot) under `drizzle/`.
3. **Read the generated SQL before applying it.** Drizzle's diffing is
   usually right but not infallible, especially for renames (which it
   can see as a drop + add) — fix the migration file by hand if that
   happens rather than accepting data loss.
4. Apply it to your own database:
   ```bash
   pnpm --filter @magic-vault/server db:migrate
   ```
   During fast local iteration on a schema that hasn't been finalized
   yet, `pnpm --filter @magic-vault/server db:push` (schema pushed
   directly, no migration file) is faster — but before opening a PR,
   make sure there's a real migration generated via `db:generate` that
   matches your final schema, since `db:push` alone leaves nothing for
   anyone else (or the deploy pipeline) to apply.
5. Commit `schema.ts` together with the generated `drizzle/*.sql` and
   `drizzle/meta/*` files in the same PR. Reviewers should be able to
   see the SQL, not just the Drizzle schema diff.
6. If your change references anything Neon Auth provides (the `auth`
   schema, the `authenticated` role, `auth.user_id()`/`auth_is_org_member()`),
   remember that only exists on a database that's had Neon Auth enabled
   — see the [Neon setup](README.md#setting-up-neon) note about this
   ordering.

`pnpm --filter @magic-vault/server db:studio` opens Drizzle Studio if
you want to poke at the database directly while iterating.

## Opening a PR

- Keep PRs scoped to one change — a schema migration that also
  refactors unrelated code makes the migration harder to review.
- Call out in the PR description if a change touches the firmware
  protocol (`firmware/PROTOCOL.md` / `firmware/main/main.ino`) — firmware
  and the app's serial layer need to stay in sync, and the firmware
  can't be hot-reloaded the way the app can.
