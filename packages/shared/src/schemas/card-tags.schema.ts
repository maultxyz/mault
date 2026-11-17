import { z } from "zod";
import { BULK_SCAN_IDS_MAX } from "../constants/collection-cards.constant";
import { CARD_TAGS } from "../constants/card-tags.constant";

export const setCardTagsRequestSchema = z.object({
  scanIds: z.array(z.string()).min(1).max(BULK_SCAN_IDS_MAX),
  tags: z.array(z.enum(CARD_TAGS)).min(1),
  enabled: z.boolean(),
});

export type SetCardTagsRequest = z.infer<typeof setCardTagsRequestSchema>;
