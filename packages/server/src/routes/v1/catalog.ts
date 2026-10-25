import { apiIdParamsSchema } from "@magic-vault/shared";
import type { Handler } from "hono";
import { apiKeyQuery } from "../../db";
import { PUBLIC_API_LOCATION_NOT_FOUND } from "../../lib/constants/api-keys";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import { loadPublicApiLocationCards } from "../../lib/public-api/cards";
import {
  loadPublicApiCollections,
  loadPublicApiLocations,
} from "../../lib/public-api/catalog";
import { toLocationCardFilters } from "../../lib/public-api/query";
import {
  apiError,
  toApiList,
  toCompleteApiList,
} from "../../lib/public-api/responses";

export const listCollectionsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const collections = await apiKeyQuery(orgId, (tx) =>
    loadPublicApiCollections(tx, orgId),
  );
  return c.json(toCompleteApiList(collections));
};

export const listLocationsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const locations = await apiKeyQuery(orgId, (tx) =>
    loadPublicApiLocations(tx, orgId),
  );
  return c.json(toCompleteApiList(locations));
};

export const listLocationCardsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success) {
    return apiError(c, 404, "not_found", PUBLIC_API_LOCATION_NOT_FOUND);
  }
  const filters = toLocationCardFilters(c.req.query());
  const page = await apiKeyQuery(orgId, (tx) =>
    loadPublicApiLocationCards(tx, orgId, params.data.id, filters),
  );
  return page
    ? c.json(toApiList(c, page))
    : apiError(c, 404, "not_found", PUBLIC_API_LOCATION_NOT_FOUND);
};
