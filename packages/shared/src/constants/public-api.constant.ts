import type { PublicApiEndpoint } from "../interfaces/public-api.interface";
import {
  apiCollectionListSchema,
  apiIdParamsSchema,
  apiListCardsQuerySchema,
  apiLocationCardsQuerySchema,
  apiLocationListSchema,
  apiScannedCardListSchema,
  apiScannedCardPageSchema,
  apiScannedCardSchema,
} from "../schemas/public-api.schema";

export const PUBLIC_API_TITLE = "Mault API";
export const PUBLIC_API_KEY_HEADER = "X-API-Key";

export const PUBLIC_API_ENDPOINTS = [
  {
    operationId: "listCollections",
    method: "get",
    path: "/v1/collections",
    tag: "Collections",
    summary: "List collections",
    description: "Every collection in the organization, in one page.",
    response: apiCollectionListSchema,
  },
  {
    operationId: "listLocations",
    method: "get",
    path: "/v1/locations",
    tag: "Locations",
    summary: "List storage locations",
    description: "Every storage location (box), in one page.",
    response: apiLocationListSchema,
  },
  {
    operationId: "listLocationCards",
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
    method: "get",
    path: "/v1/cards/{id}",
    tag: "Cards",
    summary: "Get a card",
    description: "One physical copy, wherever it is now.",
    pathParams: apiIdParamsSchema,
    response: apiScannedCardSchema,
  },
] as const satisfies readonly PublicApiEndpoint[];
