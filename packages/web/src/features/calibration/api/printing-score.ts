import type { PrintingScoreResult } from "@magic-vault/shared";
import { apiPostForm } from "@/lib/api/client";

export async function scorePrinting(
  formData: FormData,
): Promise<PrintingScoreResult> {
  return apiPostForm<PrintingScoreResult>("/api/cards/printing-score", formData);
}
