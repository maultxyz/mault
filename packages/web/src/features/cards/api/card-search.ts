import { apiGet } from "@/lib/api/client";
import type {
  CardSearchPage,
  PlayingCard,
  Result,
} from "@magic-vault/shared";

export async function searchCards(
  query: string,
  collectionGuid?: string,
  offset = 0,
): Promise<Result<CardSearchPage>> {
  const params = new URLSearchParams({ q: query });
  if (collectionGuid) params.set("collectionGuid", collectionGuid);
  if (offset > 0) params.set("offset", String(offset));
  return apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`);
}

export async function getCardById(
  id: string,
  collectionGuid?: string,
): Promise<Result<PlayingCard>> {
  const params = collectionGuid
    ? `?${new URLSearchParams({ collectionGuid })}`
    : "";
  return apiGet<Result<PlayingCard>>(`/api/cards/search/${id}${params}`);
}
