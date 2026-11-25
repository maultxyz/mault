import { z } from "zod";
import { REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS } from "../constants/review-auto-check.constant";

export const reviewAutoCheckRequestSchema = z.object({
  scanIds: z
    .array(z.uuid())
    .min(1)
    .max(REVIEW_AUTO_CHECK_REQUEST_MAX_SCANS),
});

export type ReviewAutoCheckRequest = z.infer<typeof reviewAutoCheckRequestSchema>;
