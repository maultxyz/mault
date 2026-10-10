import {
  PUBLIC_API_ENDPOINTS,
  type PublicApiOperationId,
} from "@magic-vault/shared";
import { Hono, type Handler } from "hono";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import { toPublicApiRoutePath } from "../../lib/public-api/responses";
import { requireApiKey } from "../../middleware/api-key";
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
};

const router = new Hono<ApiKeyEnv>();
for (const endpoint of PUBLIC_API_ENDPOINTS) {
  router.on(
    endpoint.method.toUpperCase(),
    toPublicApiRoutePath(endpoint.path),
    requireApiKey,
    handlers[endpoint.operationId],
  );
}

export { router as publicApiRouter };
