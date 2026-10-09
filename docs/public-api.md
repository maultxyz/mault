# Mault public API

Look up where your cards are from your own systems, for example so an online shop can tell staff which box and position to pick an ordered card from. It's read-only: orders and stock stay in your shop.

API access is part of the Business plan.

## Authentication

Create a key in **Settings > Integrations > API keys** (organization owners and admins). The full key is shown once. It starts with `mv_`.

Send it as a bearer token:

```http
GET /v1/cards?cardId=e3285e6b-3e79-4d7c-bf96-d920f973b122
Authorization: Bearer mv_...
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

### `GET /v1/cards`

Scanned cards. One entry is one physical card (one scan), so three copies of a printing are three entries, each with its own `scanId` and location.

| Parameter | Description |
| --- | --- |
| `cardId` | Only these printings. One id, or up to 100 separated by commas. |
| `name` | Name contains this text (case-insensitive). |
| `set` | Set code, e.g. `m10`. |
| `number` | Collector number. Leading zeros are ignored. |
| `foil` | `true` or `false`. |
| `inStorage` | `true` for cards in a storage location, `false` for cards that aren't. |
| `location` | Only cards in this storage location (guid). |
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
      "updatedAt": "2026-10-09T15:20:02.118Z",
      "card": { "...": "the full card record, including image URLs and every price" }
    }
  ],
  "nextCursor": "eyJpIjo...",
  "nextSince": "2026-10-09T15:19:30.000Z"
}
```

- `cardId` identifies the printing, so it's the value to map to a product in your shop. `scanId` identifies one physical copy.
- `location` is null when the card isn't in a storage location. `position` is its place in that box, counting up in the order cards were put away. Positions are never renumbered, so there can be gaps.
- `price` and `currency` follow the organization's price source (Settings > Pricing), foil price for a foil copy.
- `needsReview` is true when the scan wasn't certain and nobody has confirmed it yet.

Without `since`, results are in a stable order and `nextCursor` pages through all of them. With `since`, they're ordered by `updatedAt`. A card counts as changed when anything about the card itself changes (corrected, foil changed, put into or taken out of a storage location). Price updates and renaming a collection or location don't count. `nextSince` is set a minute before the request, so passing it as the next `since` may return a card twice but never misses one.

Removed cards (sold, deleted) simply stop appearing; the API doesn't report them.

### `GET /v1/cards/{scanId}`

One card, in the same shape. `404` if it doesn't exist.

## Picking an order

For each order line, look the card up when you pick:

```http
GET /v1/cards?cardId=<printing id>&foil=false&inStorage=true
```

Each item's `location.name` and `location.position` say which box and where in it. If your shop doesn't store Mault's `cardId`, use `set` and `number` (or `name`) instead.
