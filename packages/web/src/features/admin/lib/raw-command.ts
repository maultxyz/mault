import { formValidationMessage } from "@magic-vault/shared";
import { z } from "zod";

export function parseRawCommandObject(
  text: string,
): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const rawCommandFormSchema = z.object({
  command: z
    .string()
    .trim()
    .min(1, formValidationMessage("commandRequired"))
    .refine(
      (text) => parseRawCommandObject(text) !== null,
      formValidationMessage("jsonObjectInvalid"),
    ),
});
