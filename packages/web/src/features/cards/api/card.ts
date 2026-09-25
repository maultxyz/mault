import type { CardSearchResult } from "@magic-vault/shared";
import { apiPostForm } from "@/lib/api/client";

export async function searchByImage(formData: FormData): Promise<CardSearchResult> {
  return apiPostForm<CardSearchResult>("/api/cards", formData);
}

export async function searchByVector(formData: FormData): Promise<CardSearchResult> {
  return apiPostForm<CardSearchResult>("/api/cards/by-vector", formData);
}
