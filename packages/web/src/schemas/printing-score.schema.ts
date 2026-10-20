import { z } from "zod";

export const printingScoreSchema = z.object({
  setCode: z.string().trim().min(1).max(64),
  cardId: z.string().trim().min(1).max(1024),
});

export type PrintingScoreFormValues = z.infer<typeof printingScoreSchema>;
