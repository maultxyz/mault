import { API_BASE } from "@/lib/constants/api";
import {
  SHORT_LINK_RESOLVE_API_PATH,
  type Result,
  type ShortLinkTarget,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

async function resolveShortLink(shortCode: string): Promise<ShortLinkTarget | null> {
  const params = new URLSearchParams({ code: shortCode });
  const res = await fetch(`${API_BASE}${SHORT_LINK_RESOLVE_API_PATH}?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const result = (await res.json()) as Result<ShortLinkTarget>;
  return result.data ?? null;
}

export const shortLinkQueryOptions = (shortCode: string) =>
  queryOptions({
    queryKey: ["short-link", shortCode],
    queryFn: () => resolveShortLink(shortCode),
    retry: false,
  });
