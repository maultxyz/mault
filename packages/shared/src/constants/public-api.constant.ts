import type { PublicApiEndpoint } from "../interfaces/public-api.interface";
import {
  apiCollectionListSchema,
  apiIdParamsSchema,
  apiListCardsQuerySchema,
  apiLocationCardsQuerySchema,
  apiLocationListSchema,
  apiMoveCardBodySchema,
  apiScannedCardListSchema,
  apiScannedCardPageSchema,
  apiScannedCardSchema,
} from "../schemas/public-api.schema";

export const PUBLIC_API_TITLE = "Mault API";
export const PUBLIC_API_KEY_HEADER = "X-API-Key";

export const PUBLIC_API_ENDPOINTS = [
  {
    operationId: "listCollections",
    scope: "read",
    method: "get",
    path: "/v1/collections",
    tag: "Collections",
    summary: "List collections",
    description: "Every collection in the organization, in one page.",
    response: apiCollectionListSchema,
  },
  {
    operationId: "listLocations",
    scope: "read",
    method: "get",
    path: "/v1/locations",
    tag: "Locations",
    summary: "List storage locations",
    description: "Every storage location (box), in one page.",
    response: apiLocationListSchema,
  },
  {
    operationId: "listLocationCards",
    scope: "read",
    method: "get",
    path: "/v1/locations/{id}/cards",
    tag: "Locations",
    summary: "List the cards in a location",
    description:
      "The cards in one box, in position order (the order they were put away).",
    pathParams: apiIdParamsSchema,
    query: apiLocationCardsQuerySchema,
    response: apiScannedCardPageSchema,
  },
  {
    operationId: "listCards",
    scope: "read",
    method: "get",
    path: "/v1/cards",
    tag: "Cards",
    summary: "Find cards",
    description:
      "Physical copies across every box. One entry per copy, so three copies are three entries. Removed cards simply stop appearing.",
    query: apiListCardsQuerySchema,
    response: apiScannedCardListSchema,
  },
  {
    operationId: "getCard",
    scope: "read",
    method: "get",
    path: "/v1/cards/{id}",
    tag: "Cards",
    summary: "Get a card",
    description: "One physical copy, wherever it is now.",
    pathParams: apiIdParamsSchema,
    response: apiScannedCardSchema,
  },
  {
    operationId: "removeCardFromLocation",
    scope: "read_write",
    method: "delete",
    path: "/v1/cards/{id}/location",
    tag: "Cards",
    summary: "Remove a card from its box",
    description:
      "Takes a card out of its storage location, e.g. once it's picked for an order. The card stays in its collection. Does nothing to a card that isn't in a location. Needs a read and write key.",
    pathParams: apiIdParamsSchema,
    response: apiScannedCardSchema,
  },
  {
    operationId: "moveCard",
    scope: "read_write",
    method: "post",
    path: "/v1/cards/{id}/move",
    tag: "Cards",
    summary: "Move a card to another box",
    description:
      "Puts a card at the end of another storage location. Positions are never renumbered, so its old place stays a gap. Needs a read and write key.",
    pathParams: apiIdParamsSchema,
    body: apiMoveCardBodySchema,
    response: apiScannedCardSchema,
  },
  {
    operationId: "deleteCard",
    scope: "read_write",
    method: "delete",
    path: "/v1/cards/{id}",
    tag: "Cards",
    summary: "Delete a card",
    description:
      "Permanently deletes a card, e.g. once it's sold, along with its scan photo. This can't be undone. Needs a read and write key.",
    pathParams: apiIdParamsSchema,
    response: null,
  },
] as const satisfies readonly PublicApiEndpoint[];
