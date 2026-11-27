import { apiPost } from "@/lib/api/client";
import type {
  DeckLinkImportRequest,
  DeckLinkImportResult,
} from "@magic-vault/shared";

export async function loadDeckLink(
  request: DeckLinkImportRequest,
): Promise<DeckLinkImportResult> {
  return apiPost<DeckLinkImportResult>("/api/cards/deck-link", request);
}
