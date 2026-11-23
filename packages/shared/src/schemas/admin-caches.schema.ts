import { z } from "zod";
import {
  ADMIN_CACHE_CLEAR_KEYS_MAX,
  ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH,
  ADMIN_CACHE_ORG_ID_MAX_LENGTH,
  ADMIN_CACHE_ORG_ID_MIN_LENGTH,
  ADMIN_CACHE_ORG_ID_PATTERN,
} from "../constants/admin-caches.constant";
import { formValidationMessage } from "../form-validation";

export const adminClearCacheEntriesRequestSchema = z.union([
  z.object({ keys: z.array(z.string()).min(1).max(ADMIN_CACHE_CLEAR_KEYS_MAX) }),
  z.object({
    keyContains: z.string().min(1).max(ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH),
  }),
  z.object({ clearsWholeCache: z.literal(true) }),
]);

export type AdminClearCacheEntriesRequest = z.infer<
  typeof adminClearCacheEntriesRequestSchema
>;

export const adminCacheOrgIdSchema = z
  .string()
  .trim()
  .min(ADMIN_CACHE_ORG_ID_MIN_LENGTH, formValidationMessage("organizationIdInvalid"))
  .max(ADMIN_CACHE_ORG_ID_MAX_LENGTH, formValidationMessage("organizationIdInvalid"))
  .regex(ADMIN_CACHE_ORG_ID_PATTERN, formValidationMessage("organizationIdInvalid"));

export const adminCacheOrgFormSchema = z.object({ orgId: adminCacheOrgIdSchema });

export type AdminCacheOrgFormValues = z.infer<typeof adminCacheOrgFormSchema>;
