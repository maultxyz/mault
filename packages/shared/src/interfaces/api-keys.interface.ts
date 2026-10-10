import type { z } from "zod";
import type {
  API_FINISHES,
  API_KEY_SCOPES,
} from "../constants/api-keys.constant";
import type {
  apiCardLocationSchema,
  apiCollectionRefSchema,
  apiCollectionSchema,
  apiErrorSchema,
  apiListCardsQuerySchema,
  apiLocationCardsQuerySchema,
  apiLocationRefSchema,
  apiLocationSchema,
  apiPricesSchema,
  apiScannedCardListSchema,
  apiScannedCardSchema,
} from "../schemas/public-api.schema";

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface OrgApiKey {
  guid: string;
  name: string;
  keyPrefix: string;
  scope: ApiKeyScope;
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface OrgApiKeyList {
  keys: OrgApiKey[];
  canManage: boolean;
}

export interface OrgApiKeyInput {
  name: string;
  scope: ApiKeyScope;
}

export interface CreatedOrgApiKey {
  apiKey: OrgApiKey;
  rawKey: string;
}

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = ApiError["code"];
export type ApiList<T> = {
  object: "list";
  has_more: boolean;
  next_page: string | null;
  data: T[];
};
export type ApiScannedCardList = z.infer<typeof apiScannedCardListSchema>;
export type ApiCollectionRef = z.infer<typeof apiCollectionRefSchema>;
export type ApiCollection = z.infer<typeof apiCollectionSchema>;
export type ApiLocationRef = z.infer<typeof apiLocationRefSchema>;
export type ApiCardLocation = z.infer<typeof apiCardLocationSchema>;
export type ApiLocation = z.infer<typeof apiLocationSchema>;
export type ApiPrices = z.infer<typeof apiPricesSchema>;
export type ApiFinish = (typeof API_FINISHES)[number];
export type ApiScannedCard = z.infer<typeof apiScannedCardSchema>;
export type ApiListCardsQuery = z.infer<typeof apiListCardsQuerySchema>;
export type ApiLocationCardsQuery = z.infer<typeof apiLocationCardsQuerySchema>;
