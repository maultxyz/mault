import type {
  CardSearchResult,
  CardTextSearchResult,
} from "@magic-vault/shared";
import { apiPostForm } from "@/lib/api/client";
import type { ApiPostFormOptions } from "@/lib/interfaces/api-client";

export async function searchByImage(
  formData: FormData,
  options?: ApiPostFormOptions,
): Promise<CardSearchResult> {
  return apiPostForm<CardSearchResult>("/api/cards", formData, options);
}

export async function searchByVector(
  formData: FormData,
  options?: ApiPostFormOptions,
): Promise<CardSearchResult> {
  return apiPostForm<CardSearchResult>(
    "/api/cards/by-vector",
    formData,
    options,
  );
}

export async function searchByText(
  formData: FormData,
  options?: ApiPostFormOptions,
): Promise<CardTextSearchResult> {
  return apiPostForm<CardTextSearchResult>(
    "/api/cards/by-text",
    formData,
    options,
  );
}
