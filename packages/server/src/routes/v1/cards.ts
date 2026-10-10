import {
  apiIdParamsSchema,
  type ApiScannedCardList,
} from "@magic-vault/shared";
import type { Handler } from "hono";
import { apiKeyQuery } from "../../db";
import { PUBLIC_API_CARD_NOT_FOUND } from "../../lib/constants/api-keys";
import type { ApiKeyEnv } from "../../lib/interfaces/api-keys";
import {
  loadPublicApiCard,
  loadPublicApiCards,
} from "../../lib/public-api/cards";
import { toCardFilters } from "../../lib/public-api/query";
import {
  apiError,
  apiErrorFrom,
  toApiList,
} from "../../lib/public-api/responses";

export const listCardsHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  try {
    const filters = toCardFilters(c.req.query());
    const page = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiCards(tx, orgId, filters),
    );
    const body: ApiScannedCardList = {
      ...toApiList(c, page),
      next_since: page.nextSince,
    };
    return c.json(body);
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};

export const getCardHandler: Handler<ApiKeyEnv> = async (c) => {
  const orgId = c.get("orgId");
  const params = apiIdParamsSchema.safeParse(c.req.param());
  if (!params.success) {
    return apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  }
  try {
    const card = await apiKeyQuery(orgId, (tx) =>
      loadPublicApiCard(tx, orgId, params.data.id),
    );
    return card
      ? c.json(card)
      : apiError(c, 404, "not_found", PUBLIC_API_CARD_NOT_FOUND);
  } catch (err) {
    return apiErrorFrom(c, err);
  }
};
