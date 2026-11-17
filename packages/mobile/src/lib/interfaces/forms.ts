import type { z } from "zod";
import type { signInSchema } from "@/features/account/lib/auth-schemas";
import type { binSchema } from "@/features/rules/lib/bin-schema";
import type { modeSchema, repackSchema } from "@/features/rules/lib/mode-schema";

export type SignInValues = z.infer<typeof signInSchema>;

export type BinFormValues = z.infer<typeof binSchema>;

export type ModeFormValues = z.infer<typeof modeSchema>;

export type RepackFormValues = z.infer<typeof repackSchema>;
