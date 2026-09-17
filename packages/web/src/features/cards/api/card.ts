import type { Result, SearchCardMatch } from "@magic-vault/shared";
import { apiPostForm } from "@/lib/api/client";

export async function searchByImage(formData: FormData): Promise<Result<SearchCardMatch[] | null>> {
  return apiPostForm<Result<SearchCardMatch[] | null>>("/api/cards", formData);
}

export async function searchByVector(formData: FormData): Promise<Result<SearchCardMatch[] | null>> {
  return apiPostForm<Result<SearchCardMatch[] | null>>("/api/cards/by-vector", formData);
}
