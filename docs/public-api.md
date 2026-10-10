# Mault public API

Look up where your cards are from your own systems, for example so an online shop can tell staff which box and position to pick an ordered card from, and update Mault once a card is picked, moved or sold. Orders and stock stay in your shop.

The API follows [Scryfall's](https://scryfall.com/docs/api) conventions: every object has an `object` field naming its type, field names are `snake_case`, lists are paged `list` objects with `has_more` and `next_page`, errors are `error` objects, and prices are strings. Card fields use Scryfall's names (`set`, `set_name`, `collector_number`, `rarity`, `lang`, `prices`), for every game, not just Magic.

API access is part of the Business plan.

The full OpenAPI 3.1 spec, including the webhook events, is served by the web app at `/openapi.json`, and you can try every endpoint in the **API playground** (Settings > Integrations > API playground).

## Authentication

Create a key in **Settings > Integrations > API keys** (organization owners and admins). The full key is shown once. It starts with `mv_`.

Send it in the `X-API-Key` header on every request, over HTTPS only:

```http
GET /v1/cards?set=m10&collector_number=146
X-API-Key: mv_...
```

Keys belong to the organization, not to the person who created them, so they keep working if that person leaves. Revoking a key stops it immediately.

Paths below are relative to your Mault API server's base URL (the same one the web app calls).

## Objects

### Lists

Every endpoint that returns several objects returns a `list`:

```json
{
  "object": "list",
  "has_more": true,
  "next_page": "https://.../v1/cards?set=m10&cursor=eyJpIjo...",
  "data": [ ... ]
}
```

While `has_more` is `true`, request `next_page` exactly as given (it keeps your filters) to get the next page. `/v1/collections` and `/v1/locations` always return everything in one page.

### Errors

Every error responds with a matching HTTP status and an `error` object:

```json
{
  "object": "error",
  "code": "not_found",
  "status": 404,
  "details": "No card found with that id."
}
```

| `code` | `status` | When |
| --- | --- | --- |
| `bad_request` | 400 | A parameter is invalid. `details` says which. |
| `unauthorized` | 401 | The key is missing, invalid or revoked. |
| `forbidden` | 403 | The organization's plan doesn't include API access, or a read-only key called a write endpoint. |
| `not_found` | 404 | No object with that id. |
| `rate_limited` | 429 | Too many requests. See [Rate limits](#rate-limits). |
| `internal_error` | 500 | Something went wrong on Mault's side. |

### `scanned_card`

One physical copy of a card, so three copies of a printing are three `scanned_card`s, each with its own `id` and location.

```json
{
  "object": "scanned_card",
  "id": "0f6c2a1e-...",
  "card_id": "e3285e6b-3e79-4d7c-bf96-d920f973b122",
  "name": "Lightning Bolt",
  "set": "m10",
  "set_name": "Magic 2010",
  "collector_number": "146",
  "rarity": "common",
  "lang": "en",
  "game": "mtg",
  "finish": "nonfoil",
  "foil_type": null,
  "prices": {
    "usd": "1.42",
    "usd_foil": "6.10",
    "eur": "1.10",
    "eur_foil": null
  },
  "location": {
    "object": "location",
    "id": "c3d4...",
    "name": "Box 12",
    "position": 87
  },
  "collection": {
    "object": "collection",
    "id": "a1b2...",
    "name": "Store stock"
  },
  "needs_review": false,
  "scanned_at": "2026-10-09T14:03:11.204Z",
  "created_at": "2026-10-09T14:03:11.391Z",
  "updated_at": "2026-10-09T15:20:02.118Z"
}
```

| Field | Description |
| --- | --- |
| `id` | This copy (the scan). |
| `card_id` | The printing. For Magic this is the Scryfall card `id`; for other games it's the id from that game's card database. Map this to a product in your shop. |
| `game` | Game key, e.g. `mtg`, `pokemon`, `lorcana`. |
| `finish` | `nonfoil` or `foil`. |
| `foil_type` | For foils, the game's foil type (e.g. reverse holo), when the scan recorded one. `null` otherwise. |
| `prices` | The printing's current prices as strings, like Scryfall: `usd`/`usd_foil` from TCGplayer, `eur`/`eur_foil` from Cardmarket. `null` when there's no price. Pick the one matching `finish`. |
| `location` | Where this copy is stored, or `null` when it isn't in a storage location. `position` is its place in that box, counting up in the order cards were put away. Positions are never renumbered, so there can be gaps. |
| `needs_review` | `true` when the scan wasn't certain and nobody has confirmed it yet. |

Only these fields are returned, not the full card record from the card's source database.

### `collection` and `location`

```json
{ "object": "collection", "id": "a1b2...", "name": "Store stock", "game": "mtg", "lang": "en", "card_count": 1520 }
{ "object": "location", "id": "c3d4...", "name": "Box 12", "card_count": 214, "created_at": "2026-09-01T10:00:00.000Z" }
```

All timestamps are UTC ISO 8601.

## Rate limits

Each key can make 120 requests per minute. Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (seconds until the window resets). Past the limit you get a `rate_limited` error with a `Retry-After` header.

## Endpoints

### `GET /v1/collections`

A `list` of every `collection`.

### `GET /v1/locations`

A `list` of every storage `location`.

### `GET /v1/locations/{id}/cards`

A paged `list` of the `scanned_card`s in one box, in position order (the order they were put away). Takes `limit` (1 to 500, default 100). `not_found` if the location doesn't exist.

### `GET /v1/cards`

A paged `list` of `scanned_card`s across every box.

| Parameter | Description |
| --- | --- |
| `card_id` | Only these printings. One id, or up to 100 separated by commas. |
| `name` | Name contains this text (case-insensitive). |
| `set` | Set code, e.g. `m10`. |
| `collector_number` | Collector number. Leading zeros are ignored. |
| `finish` | `foil` or `nonfoil`. |
| `in_storage` | `true` for cards in a storage location, `false` for cards that aren't. |
| `collection` | Only cards in this collection (id). |
| `since` | Only cards that changed after this timestamp. |
| `limit` | Page size, 1 to 500, default 100. |

This list also carries `next_since`. Without `since`, results are in a stable order. With `since`, they're ordered by `updated_at`. A card counts as changed when anything about the card itself changes (corrected, finish changed, put into or taken out of a storage location). Price updates and renaming a collection or location don't count. `next_since` is set a minute before the request, so passing it as the next `since` may return a card twice but never misses one.

Removed cards (sold, deleted) simply stop appearing; the API doesn't report them.

### `GET /v1/cards/{id}`

One `scanned_card`, wherever it is now. `not_found` if it doesn't exist.

### Changing cards

These need a key created with **Allow write access**. A read-only key gets a `forbidden` error. The app's open screens update straight away.

#### `DELETE /v1/cards/{id}/location`

Takes a card out of its storage location, for example once it's picked for an order. It stays in its collection. Returns the updated `scanned_card` (with `location: null`). Calling it on a card that isn't in a location just returns the card.

#### `POST /v1/cards/{id}/move`

Moves a card to the end of another storage location. Its old position stays a gap, since positions are never renumbered. Returns the updated `scanned_card`.

```json
{ "location": "c3d4..." }
```

`not_found` if the card or the location doesn't exist.

#### `DELETE /v1/cards/{id}`

Permanently deletes a card and its scan photo, for example once it's sold. This can't be undone. Responds `204 No Content`.

## Picking an order

For each order line, look the card up when you pick:

```http
GET /v1/cards?card_id=<printing id>&finish=nonfoil&in_storage=true
```

Each card's `location.name` and `location.position` say which box and where in it. If your shop doesn't store Mault's `card_id`, use `set` and `collector_number` (or `name`) instead.

Once the card is pulled, call `DELETE /v1/cards/{id}/location` so it stops showing up in that box, or `DELETE /v1/cards/{id}` if you don't want to keep it in Mault at all.

## Webhooks

Instead of polling, Mault can POST events to your server. Add a webhook in **Settings > Integrations > Webhooks** (organization owners and admins) with a public `https://` URL and the events it should receive. You get a signing secret (`whsec_...`) once, when you create it.

### Events

Every request body is an `event`:

```json
{
  "object": "event",
  "id": "6f1c2b7e-...",
  "type": "cards.stored",
  "created_at": "2026-10-09T15:20:02.118Z",
  "data": { ... }
}
```

| `type` | Sent when | `data` |
| --- | --- | --- |
| `card.scanned` | A card is scanned and saved, or an unmatched scan is identified. | The `scanned_card`. At scan time it has no `location` yet. |
| `cards.stored` | A bin is put away into a storage location. | `{ "object": "stored_cards", "location": { "object": "location", "id", "name" }, "cards": [scanned_card, ...] }`, in position order, at most 200 cards per event (a bigger bin sends several events). |
| `webhook.test` | You click "Send test event". | `{ "object": "test", "message": ... }` |

with these headers:

| Header | Value |
| --- | --- |
| `X-Mault-Event` | The event `type`. |
| `X-Mault-Delivery` | The event `id`. Retries reuse it, so use it to ignore duplicates. |
| `X-Mault-Signature` | `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with your secret>` |

### Verifying the signature

Compute the HMAC over the raw request body exactly as received (before parsing JSON), compare in constant time, and reject old timestamps:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyMaultWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=")),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  return (
    expected.length === parts.v1?.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
  );
}
```

### Delivery and retries

- Answer with any `2xx` within 10 seconds. Anything else (including redirects, which aren't followed) counts as a failure.
- A failed delivery is retried after 10 seconds, 1 minute, 5 minutes and 30 minutes, then dropped.
- After 20 failed deliveries in a row the webhook is disabled. Fix your endpoint, then use **Re-enable**. Events from while it was disabled aren't sent.
- Deliveries can arrive more than once and out of order. Deduplicate on `X-Mault-Delivery` (or the card's `id`).
- Webhooks are part of the Business plan; deliveries stop if the organization leaves it.
