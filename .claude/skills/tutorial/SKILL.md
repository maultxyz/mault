---
name: tutorial
description: Make a captioned tutorial video of part of the web app (desktop and mobile web, English only). Use when asked to create, update or re-record a tutorial or how-to video.
---

# Tutorial videos

Package: `packages/tutorials`. Playwright drives the real app and saves screencast frames plus a timeline; Remotion turns them into a branded MP4 with an intro card, automatic zoom on each action, a cursor (tap marker on phones), burned-in captions and an outro. No voiceover.

## Keep it cheap

- Do not take screenshots, run the app yourself or browse the UI to "look". Read only the route/component files you need for accessible names and the matching `packages/web/src/locales/en/<namespace>.json` keys.
- Copy `src/tutorials/find-a-card/` as the template. Do not read the rest of the package unless a run fails.
- Do not type-check or build; `pnpm --filter @magic-vault/tutorials test` checks the captions.

## Writing a tutorial

Create `packages/tutorials/src/tutorials/<kebab-name>/`:

- `tutorial.ts`: `export default defineTutorial({ startPath, viewports: ["desktop", "mobile"], async run(tutorial) { ... } })`.
- `captions.json`: `{ "title", "subtitle"?, "steps": { "<key>": "<caption>" } }`. English only: never write German, French or any other caption files. One short sentence per step, no em dashes, written for users (not "click the button with aria-label").

The `tutorial` API (`TutorialContext` in `src/lib/interfaces/tutorial.ts`):

- `tutorial.step("captionKey", async () => { ... })` shows that caption for the step and holds it long enough to read.
- `tutorial.click(locator)`, `tutorial.type(locator, "text", { pressEnterAfterTyping })`, `tutorial.hover(locator)`: animate the cursor, zoom in on the target (`{ zoomsIn: false }` to stay wide), then act. Phones tap.
- `tutorial.press("Escape")`, `tutorial.goto("/app/...")`, `tutorial.zoomOut()` (show the whole screen, e.g. after results load), `tutorial.pause(ms)`.
- `tutorial.ui("namespace:path.to.key", { count })` returns the English web string. Locate elements with it (`page.getByRole("button", { name: tutorial.ui("collections:newCollection") })`) instead of copying labels, so copy changes in the locale files keep scripts working.
- Scanning: every recording has a fake camera and hand scan turned on. `await tutorial.showCardToCamera("Sol Ring")` slides that card (Scryfall image by exact name, MTG only, cached in `out/.card-images`) under the camera; the real scanner then detects, identifies and saves it. `await tutorial.clearCamera()` takes it away before the next card. Press Start scanning first (`scanner:scannerControls.start`), wait for the card to show up in the UI before clearing, and pick cards worth more than the org's buy minimum when offers matter. See `business-intake/tutorial.ts`.
- `prepare(tutorial)` (optional, next to `run`) runs after the page loads but before recording starts; use it to undo leftovers from a failed run (e.g. cancel an open intake) so reruns start clean.
- `tutorial.isMobile` for flows that differ below `md` (use separate caption keys such as `openSearchMobile` when wording differs).
- Wait for data with Playwright locators (`await locator.waitFor()`), never fixed sleeps.

Scanning saves real cards into the active collection: end the tutorial by removing them (cancelling an intake does) or say so in the summary. Prefer flows that change nothing in the demo org. When a tutorial must create data, name it so a rerun does not collide, and say so in the summary.

## Running

```bash
pnpm --filter @magic-vault/tutorials browsers        # once per machine
pnpm --filter @magic-vault/tutorials sign-in         # once, or when the session expires: sign in with the demo account in the opened window
pnpm --filter @magic-vault/tutorials tutorial <name> [--viewport desktop,mobile]
pnpm --filter @magic-vault/tutorials record <name> ...   # recording only
pnpm --filter @magic-vault/tutorials render <name> ...   # re-render saved recordings after style changes
```

`TUTORIAL_BASE_URL` (root `.env`, default `http://localhost:5173`) picks the app; `pnpm dev` must be running for localhost. Each variant lands in `packages/tutorials/out/<name>/<viewport>/` as `tutorial.mp4`, `captions.vtt`, `transcript.txt` and `poster.jpg`. A failed step leaves `failure.png` there and the error names the step's URL; fix the locator and rerun only that `--viewport`.

Look and timing live in `src/lib/constants/tutorial.ts` and `tutorial-style.ts`; change them there, then `render` without re-recording.
