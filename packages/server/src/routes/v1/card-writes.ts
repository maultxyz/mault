import { apiIdParamsSchema, apiMoveCardBodySchema } from "@magic-vault/shared";
import type { Context, Handler } from "hono";
import { apiKeyQuery } from "../../db";
import {
  PUBLIC_API_CARD_NOT_FOUND,
  PUBLIC_API_LOCATION_NOT_FOUND,
} from "../../lib/constants/api-keys";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import type { PublicApiCardWriteResult } from "../../lib/interfaces/public-api";
import {
  deletePublicApiCard,
  movePublicApiCard,
  removePublicApiCardFromLocation,
} from "../../lib/public-api/card-writes";
import { parsePublicApiInput } from "../../lib/public-api/pagination";
import { apiError, apiErrorFrom } from "../../lib/public-api/responses";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";

function respondWithCard(
  c: Context<ApiKeyEnv>,
  result: PublicApiCardWriteResult,
) {
  if (result.status === "card_not_found") {
    return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  }
  if (result.status === "location_not_found") {
    return apiError(c, 404, "not_found", PUBLIC_API_LOCATION_NOT_FOUND);
  }
  emitToOrg(c.get("orgId"), "collections_changed", {
    guid: result.card.collection.id,
  });
  return c.json(result.card);
}

export const removeCardFromLocationHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success)
    return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  try {
    const result = await apiKeyQuery(orgId, (tx) =>
      removePublicApiCardFromLocation(tx, orgId, params.data.id),
    );
    return respondWithCard(c, result);
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};

export const moveCardHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success)
    return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  try {
    const body = parsePublicApiInput(
      apiMoveCardBodySchema,
      await c.req.json().catch(() => null),
    );
    const result = await apiKeyQuery(orgId, (tx) =>
      movePublicApiCard(tx, orgId, params.data.id, body.location),
    );
    return respondWithCard(c, result);
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};

export const deleteCardHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success)
    return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  try {
    const deleted = await apiKeyQuery(orgId, (tx) =>
      deletePublicApiCard(tx, orgId, params.data.id),
    );
    if (!deleted)
      return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
    deleteScanImages([deleted.imageKey]);
    emitToSession(deleted.collectionGuid, "card_removed", {
      scanId: params.data.id,
    });
    emitToOrg(orgId, "collections_changed", { guid: deleted.collectionGuid });
    return c.body(null, 204);
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};
