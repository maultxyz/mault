import type {
  CardSearchResult,
  CardTextSearchResult,
  PlayingCard,
  Result,
} from "@magic-vault/shared";
import { apiGet, apiPostForm } from "@/lib/api/client";
import type { MatchScope } from "@/lib/interfaces/scanner";

function scopeForm(embedding: number[], scope: MatchScope): FormData {
  const form = new FormData();
  form.append("collectionGuid", scope.collectionGuid);
  if (scope.preferredSetCodes?.length) {
    form.append("preferredSetCodes", JSON.stringify(scope.preferredSetCodes));
  }
  form.append("embedding", JSON.stringify(embedding));
  return form;
}

export function searchByVector(embedding: number[], scope: MatchScope): Promise<CardSearchResult> {
  return apiPostForm<CardSearchResult>("/api/cards/by-vector", scopeForm(embedding, scope));
}

export function searchByText(
  embedding: number[],
  scope: MatchScope,
  imageUri: string,
): Promise<CardTextSearchResult> {
  const form = scopeForm(embedding, scope);
  form.append("image", { uri: imageUri, name: "card.jpg", type: "image/jpeg" } as unknown as Blob);
  return apiPostForm<CardTextSearchResult>("/api/cards/by-text", form);
}

export async function getCardById(
  id: string,
  collectionGuid: string,
  lang?: string,
): Promise<PlayingCard | null> {
  const params = new URLSearchParams({ collectionGuid });
  if (lang) params.set("lang", lang);
  const result = await apiGet<Result<PlayingCard>>(`/api/cards/search/${id}?${params.toString()}`);
  return result.data ?? null;
}
