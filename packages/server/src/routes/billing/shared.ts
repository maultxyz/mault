import {
  BILLING_INTERVALS,
  DEFAULT_BILLING_INTERVAL,
} from "@magic-vault/shared";
import { z } from "zod";

export { getWebUrl as webUrl } from "../../lib/constants/urls";

export const checkoutInputSchema = z.object({
  interval: z.enum(BILLING_INTERVALS).default(DEFAULT_BILLING_INTERVAL),
});
