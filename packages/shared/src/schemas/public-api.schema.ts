import { z } from "zod";
import {
  API_FINISHES,
  PUBLIC_API_CARD_ID_FILTER_MAX,
  PUBLIC_API_PAGE_SIZE_MAX,
} from "../constants/api-keys.constant";

const timestamp = z.iso.datetime().describe("UTC ISO 8601 timestamp.");
const price = z
  .string()
  .nullable()
  .describe("Price as a decimal string, or null when there's no price.");

export const apiErrorSchema = z
  .object({
    object: z.literal("error"),
    code: z.enum([
      "bad_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "rate_limited",
      "internal_error",
    ]),
    status: z.number().int().describe("The HTTP status code."),
    details: z.string().describe("A human-readable explanation."),
  })
  .meta({ id: "Error", description: "Returned with every non-2xx status." });

export const apiCollectionRefSchema = z
  .object({
    object: z.literal("collection"),
    id: z.guid(),
    name: z.string(),
  })
  .meta({ id: "CollectionRef" });

export const apiCollectionSchema = z
  .object({
    object: z.literal("collection"),
    id: z.guid(),
    name: z.string(),
    game: z.string().nullable().describe("Game key, e.g. mtg."),
    lang: z.string(),
    card_count: z.number().int(),
  })
  .meta({ id: "Collection" });

export const apiLocationRefSchema = z
  .object({
    object: z.literal("location"),
    id: z.guid(),
    name: z.string(),
  })
  .meta({ id: "LocationRef" });

export const apiCardLocationSchema = z
  .object({
    object: z.literal("location"),
    id: z.guid(),
    name: z.string(),
    position: z
      .number()
      .int()
      .describe(
        "Place in the box, counting up in the order cards were put away. Never renumbered, so there can be gaps.",
      ),
  })
  .meta({ id: "CardLocation" });

export const apiLocationSchema = z
  .object({
    object: z.literal("location"),
    id: z.guid(),
    name: z.string(),
    card_count: z.number().int(),
    created_at: timestamp,
  })
  .meta({ id: "Location" });

export const apiPricesSchema = z
  .object({
    usd: price.describe("TCGplayer market price."),
    usd_foil: price.describe("TCGplayer foil market price."),
    eur: price.describe("Cardmarket average sell price."),
    eur_foil: price.describe("Cardmarket foil average sell price."),
  })
  .meta({ id: "Prices" });

export const apiScannedCardSchema = z
  .object({
    object: z.literal("scanned_card"),
    id: z.guid().describe("This physical copy (the scan)."),
    card_id: z
      .string()
      .describe(
        "The printing. The Scryfall id for Magic, the source database's id for other games.",
      ),
    name: z.string(),
    set: z.string(),
    set_name: z.string(),
    collector_number: z.string(),
    rarity: z.string(),
    lang: z.string(),
    game: z.string().nullable().describe("Game key, e.g. mtg."),
    finish: z.enum(API_FINISHES),
    foil_type: z
      .string()
      .nullable()
      .describe("The game's foil type for foils, when recorded."),
    prices: apiPricesSchema,
    location: apiCardLocationSchema
      .nullable()
      .describe("Where this copy is stored, or null."),
    collection: apiCollectionRefSchema,
    needs_review: z
      .boolean()
      .describe("True when the scan wasn't certain and nobody confirmed it."),
    scanned_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .meta({
    id: "ScannedCard",
    description: "One physical copy of a card.",
  });

function listSchema<T extends z.ZodType>(item: T) {
  return z.object({
    object: z.literal("list"),
    has_more: z.boolean().describe("True when another page follows."),
    next_page: z
      .url()
      .nullable()
      .describe("The full URL of the next page, or null."),
    data: z.array(item),
  });
}

export const apiCollectionListSchema = listSchema(apiCollectionSchema).meta({
  id: "CollectionList",
});

export const apiLocationListSchema = listSchema(apiLocationSchema).meta({
  id: "LocationList",
});

export const apiScannedCardPageSchema = listSchema(apiScannedCardSchema).meta({
  id: "ScannedCardPage",
});

export const apiScannedCardListSchema = listSchema(apiScannedCardSchema)
  .extend({
    next_since: timestamp.describe(
      "Pass as since on your next sync. Set a minute before the request, so a card may repeat but none is missed.",
    ),
  })
  .meta({ id: "ScannedCardList" });

export const apiStoredCardsSchema = z
  .object({
    object: z.literal("stored_cards"),
    location: apiLocationRefSchema,
    cards: z.array(apiScannedCardSchema).describe("In position order."),
  })
  .meta({ id: "StoredCards" });

export const apiWebhookTestSchema = z
  .object({
    object: z.literal("test"),
    message: z.string(),
  })
  .meta({ id: "WebhookTest" });

function eventSchema<T extends z.ZodType>(type: string, data: T) {
  return z.object({
    object: z.literal("event"),
    id: z.guid().describe("Also sent as X-Mault-Delivery. Retries reuse it."),
    type: z.literal(type),
    created_at: timestamp,
    data,
  });
}

export const apiCardScannedEventSchema = eventSchema(
  "card.scanned",
  apiScannedCardSchema,
).meta({ id: "CardScannedEvent" });

export const apiCardsStoredEventSchema = eventSchema(
  "cards.stored",
  apiStoredCardsSchema,
).meta({ id: "CardsStoredEvent" });

export const apiWebhookTestEventSchema = eventSchema(
  "webhook.test",
  apiWebhookTestSchema,
).meta({ id: "WebhookTestEvent" });

export const apiIdParamsSchema = z.object({
  id: z.guid().describe("The object's id."),
});

const limitParam = z
  .string()
  .regex(/^\d+$/)
  .refine((value) => {
    const limit = Number(value);
    return limit >= 1 && limit <= PUBLIC_API_PAGE_SIZE_MAX;
  }, `Must be from 1 to ${PUBLIC_API_PAGE_SIZE_MAX}.`)
  .optional()
  .describe(`Page size, 1 to ${PUBLIC_API_PAGE_SIZE_MAX}. Defaults to 100.`);

const cursorParam = z
  .string()
  .optional()
  .describe("Taken from next_page. You don't build it yourself.");

export const apiLocationCardsQuerySchema = z.object({
  limit: limitParam,
  cursor: cursorParam,
});

export const apiListCardsQuerySchema = z.object({
  card_id: z
    .string()
    .refine(
      (value) => value.split(",").filter(Boolean).length <= PUBLIC_API_CARD_ID_FILTER_MAX,
      `At most ${PUBLIC_API_CARD_ID_FILTER_MAX} ids.`,
    )
    .optional()
    .describe(
      `Only these printings. One id, or up to ${PUBLIC_API_CARD_ID_FILTER_MAX} separated by commas.`,
    ),
  name: z
    .string()
    .optional()
    .describe("Name contains this text (case-insensitive)."),
  set: z.string().optional().describe("Set code, e.g. m10."),
  collector_number: z
    .string()
    .optional()
    .describe("Collector number. Leading zeros are ignored."),
  finish: z.enum(API_FINISHES).optional().describe("foil or nonfoil."),
  in_storage: z
    .enum(["true", "false"])
    .optional()
    .describe("true for cards in a storage location, false for the rest."),
  collection: z.guid().optional().describe("Only cards in this collection."),
  since: z.iso
    .datetime({ offset: true })
    .optional()
    .describe(
      "Only cards that changed after this timestamp, ordered by updated_at. Use next_since from your previous sync.",
    ),
  limit: limitParam,
  cursor: cursorParam,
});
