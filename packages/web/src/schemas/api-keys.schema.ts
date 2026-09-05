import { z } from "zod";

export const createApiKeySchema = z.object({ name: z.string().min(1) });

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;
