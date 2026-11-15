import { z } from "zod";

export const csvImportTextSchema = z.object({
  text: z.string().trim().min(1),
});

export type CsvImportTextValues = z.infer<typeof csvImportTextSchema>;
