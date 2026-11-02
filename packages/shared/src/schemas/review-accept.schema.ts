import { z } from "zod";
import { BULK_SCAN_IDS_MAX } from "../constants/collection-cards.constant";

export const reviewAcceptRequestSchema = z.object({
  confirmScanIds: z.array(z.string()).max(BULK_SCAN_IDS_MAX),
  reviewScanIds: z.array(z.string()).max(BULK_SCAN_IDS_MAX),
});

export type ReviewAcceptRequest = z.infer<typeof reviewAcceptRequestSchema>;
