import { apiIdParamsSchema } from "@magic-vault/shared";
import type { Handler } from "hono";
import { apiKeyQuery } from "../../db";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import { loadPublicApiLocationCards } from "../../lib/public-api/cards";
import {
  loadPublicApiCollections,
  loadPublicApiLocations,
} from "../../lib/public-api/catalog";
import { toLocationCardFilters } from "../../lib/public-api/query";
import {
  apiError,
  apiErrorFrom,
  toApiList,
  toCompleteApiList,
} from "../../lib/public-api/responses";

export const listCollectionsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  try {
    const collections = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiCollections(tx, orgId),
    );
    return c.json(toCompleteApiList(collections));
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};

export const listLocationsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  try {
    const locations = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiLocations(tx, orgId),
    );
    return c.json(toCompleteApiList(locations));
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};

export const listLocationCardsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success) {
    return apiError(c, 404, "not_found", "No location found with that id.");
  }
  try {
    const filters = toLocationCardFilters(c.req.query());
    const page = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiLocationCards(tx, orgId, params.data.id, filters),
    );
    return page
      ? c.json(toApiList(c, page))
      : apiError(c, 404, "not_found", "No location found with that id.");
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};
