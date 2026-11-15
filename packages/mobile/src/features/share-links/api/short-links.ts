import {
  SHORT_LINK_RESOLVE_API_PATH,
  type Result,
  type ShortLinkTarget,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { API_BASE } from "@/lib/constants/config";
import { SHORT_LINK_QUERY_KEY } from "@/lib/constants/share-links";

async function resolveShortLink(shortCode: string): Promise<ShortLinkTarget | null> {
  const query = new URLSearchParams({ code: shortCode }).toString();
  const response = await fetch(`${API_BASE}${SHORT_LINK_RESOLVE_API_PATH}?${query}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const result = (await response.json()) as Result<ShortLinkTarget>;
  return result.data ?? null;
}

export const shortLinkQueryOptions = (shortCode: string) =>
  queryOptions({
    queryKey: [SHORT_LINK_QUERY_KEY, shortCode] as const,
    queryFn: () => resolveShortLink(shortCode),
    enabled: !!shortCode,
    retry: false,
  });
