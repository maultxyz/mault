import {
  PUBLIC_API_ENDPOINTS,
  type PublicApiOperationId,
} from "@magic-vault/shared";
import { Hono, type Handler } from "hono";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import {
  apiErrorFrom,
  toPublicApiRoutePath,
} from "../../lib/public-api/responses";
import { requireApiKey, requireWriteScope } from "../../middleware/api-key";
import {
  deleteCardHandler,
  moveCardHandler,
  removeCardFromLocationHandler,
} from "./card-writes";
import { getCardHandler, listCardsHandler } from "./cards";
import {
  listCollectionsHandler,
  listLocationCardsHandler,
  listLocationsHandler,
} from "./catalog";

const handlers: Record<PublicApiOperationId, Handler<ApiKeyEnv>> = {
  listCollections: listCollectionsHandler,
  listLocations: listLocationsHandler,
  listLocationCards: listLocationCardsHandler,
  listCards: listCardsHandler,
  getCard: getCardHandler,
  removeCardFromLocation: removeCardFromLocationHandler,
  moveCard: moveCardHandler,
  deleteCard: deleteCardHandler,
};

const router = new Hono<ApiKeyEnv>();
router.onError((err, c) => apiErrorFrom(c, err));
for (const endpoint of PUBLIC_API_ENDPOINTS) {
  const method = endpoint.method.toUpperCase();
  const path = toPublicApiRoutePath(endpoint.path);
  const handler = handlers[endpoint.operationId];
  if (endpoint.scope === "read_write") {
    router.on(method, path, requireApiKey, requireWriteScope, handler);
  } else {
    router.on(method, path, requireApiKey, handler);
  }
}

export { router as publicApiRouter };
