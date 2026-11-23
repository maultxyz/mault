import { z } from "zod";

export const statusMessageSettingsUpdateSchema = z
  .object({
    tradeOffers: z.boolean().optional(),
    cardReservations: z.boolean().optional(),
  })
  .strict();
