# Mault public API

Look up where your cards are from your own systems, for example so an online shop can tell staff which box and position to pick an ordered card from. It's read-only: orders and stock stay in your shop.

API access is part of the Business plan.

## Authentication

Create a key in **Settings > Integrations > API keys** (organization owners and admins). The full key is shown once. It starts with `mv_`.

Send it in the `X-API-Key` header on every request, over HTTPS only:

```http
GET /v1/cards?cardId=e3285e6b-3e79-4d7c-bf96-d920f973b122
X-API-Key: mv_...
```

Keys belong to the organization, not to the person who created them, so they keep working if that person leaves. Revoking a key stops it immediately.

Paths below are relative to your Mault API server's base URL (the same one the web app calls).

## Responses

Every response is JSON:

```json
{ "success": true, "data": ... }
```

Errors return `success: false` and a `message`, with status `400` (bad parameter), `401` (missing, invalid or revoked key), `403` (the organization's plan doesn't include API access), `404` or `429` (rate limited).

All timestamps are UTC ISO 8601.

## Rate limits

Each key can make 120 requests per minute. Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (seconds until the window resets). Past the limit you get `429` with a `Retry-After` header.

## Endpoints

### `GET /v1/collections`

Every collection, with `guid`, `name`, `game` (game key, e.g. `mtg`), `lang` and `cardCount`.

### `GET /v1/locations`

Every storage location, with `guid`, `name`, `cardCount` and `createdAt`.

### `GET /v1/locations/{guid}/cards`

What's in one box, in position order (the order cards were put away), in the same card shape as `/v1/cards`. Takes `limit` and `cursor`; the response has `items` and `nextCursor`. `404` if the location doesn't exist.

### `GET /v1/cards`

Find copies across every box. One entry is one physical card (one scan), so three copies of a printing are three entries, each with its own `scanId` and location.

| Parameter | Description |
| --- | --- |
| `cardId` | Only these printings. One id, or up to 100 separated by commas. |
| `name` | Name contains this text (case-insensitive). |
| `set` | Set code, e.g. `m10`. |
| `number` | Collector number. Leading zeros are ignored. |
| `foil` | `true` or `false`. |
| `inStorage` | `true` for cards in a storage location, `false` for cards that aren't. |
| `collection` | Only cards in this collection (guid). |
| `since` | Only cards that changed after this timestamp. |
| `limit` | Page size, 1 to 500, default 100. |
| `cursor` | `nextCursor` from the previous page. |

Response `data`:

```json
{
  "items": [
    {
      "scanId": "0f6c...",
      "collection": { "guid": "a1b2...", "name": "Store stock" },
      "game": "mtg",
      "lang": "en",
      "cardId": "e3285e6b-3e79-4d7c-bf96-d920f973b122",
      "name": "Lightning Bolt",
      "set": "m10",
      "setName": "Magic 2010",
      "collectorNumber": "146",
      "rarity": "common",
      "isFoil": false,
      "foilType": null,
      "price": 1.42,
      "currency": "USD",
      "needsReview": false,
      "location": { "guid": "c3d4...", "name": "Box 12", "position": 87 },
      "scannedAt": "2026-10-09T14:03:11.204Z",
      "createdAt": "2026-10-09T14:03:11.391Z",
      "updatedAt": "2026-10-09T15:20:02.118Z"
    }
  ],
  "nextCursor": "eyJpIjo...",
  "nextSince": "2026-10-09T15:19:30.000Z"
}
```

- `cardId` identifies the printing, so it's the value to map to a product in your shop. `scanId` identifies one physical copy.
- `location` is null when the card isn't in a storage location. `position` is its place in that box, counting up in the order cards were put away. Positions are never renumbered, so there can be gaps.
- `price` and `currency` follow the organization's price source (Settings > Pricing), foil price for a foil copy.
- Only these summary fields are returned, not the full card record from the card's source database.
- `needsReview` is true when the scan wasn't certain and nobody has confirmed it yet.

Without `since`, results are in a stable order and `nextCursor` pages through all of them. With `since`, they're ordered by `updatedAt`. A card counts as changed when anything about the card itself changes (corrected, foil changed, put into or taken out of a storage location). Price updates and renaming a collection or location don't count. `nextSince` is set a minute before the request, so passing it as the next `since` may return a card twice but never misses one.

Removed cards (sold, deleted) simply stop appearing; the API doesn't report them.

### `GET /v1/cards/{scanId}`

One copy, wherever it is now, in the same shape. `404` if it doesn't exist.

## Picking an order

For each order line, look the card up when you pick:

```http
GET /v1/cards?cardId=<printing id>&foil=false&inStorage=true
```

Each item's `location.name` and `location.position` say which box and where in it. If your shop doesn't store Mault's `cardId`, use `set` and `number` (or `name`) instead.

## Webhooks

Instead of polling, Mault can POST events to your server. Add a webhook in **Settings > Integrations > Webhooks** (organization owners and admins) with a public `https://` URL and the events it should receive. You get a signing secret (`whsec_...`) once, when you create it.

### Events

| Event | Sent when | `data` |
| --- | --- | --- |
| `card.scanned` | A card is scanned and saved, or an unmatched scan is identified. | `{ "card": <card> }` |
| `cards.stored` | A bin is put away into a storage location. | `{ "location": { "guid", "name" }, "cards": [<card>, ...] }`, in position order, at most 200 cards per event (a bigger bin sends several events) |

`<card>` is the same shape `/v1/cards` returns. At scan time a card has no `location` yet; it gets one when its bin is put away, which is the `cards.stored` event. "Send test event" posts a `webhook.test` event with `{ "message": ... }`.

Every request body looks like:

```json
{
  "id": "6f1c2b7e-...",
  "type": "cards.stored",
  "createdAt": "2026-10-09T15:20:02.118Z",
  "data": { ... }
}
```

with these headers:

| Header | Value |
| --- | --- |
| `X-Mault-Event` | The event type. |
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
- Deliveries can arrive more than once and out of order. Deduplicate on `X-Mault-Delivery` (or the card's `scanId`).
- Webhooks are part of the Business plan; deliveries stop if the organization leaves it.
