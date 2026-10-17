import { z } from "zod";

export const cardScanSchema = z.object({
  foilType: z.string().nullable(),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]),
});
