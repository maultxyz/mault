import {
  apiDelete,
  apiGet,
  apiPost,
  getAuthHeaders,
  handleForbidden,
} from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  ADMIN_FEATURE_HIGHLIGHT_MEDIA_API,
  ADMIN_FEATURE_HIGHLIGHTS_API,
  ADMIN_FEATURE_HIGHLIGHTS_QUERY_KEY,
  FEATURE_HIGHLIGHTS_API,
  FEATURE_HIGHLIGHTS_QUERY_KEY,
  FEATURE_HIGHLIGHTS_SEEN_API,
  FEATURE_HIGHLIGHT_SEEN_MAX_IDS,
  FEATURE_HIGHLIGHT_TIMELINE_STALE_MS,
  FEATURE_HIGHLIGHTS_TIMELINE_API,
} from "@/lib/constants/feature-highlights";
import type {
  AdminFeatureHighlight,
  AdminFeatureHighlightInput,
  FeatureHighlightsResponse,
  FeatureHighlightTimelinePage,
  MarkFeatureHighlightsSeenRequest,
  Result,
  UploadedFeatureHighlightMedia,
} from "@magic-vault/shared";
import { FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM } from "@magic-vault/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

async function adminFeatureHighlightRequest<T>(
  method: "POST" | "PUT",
  path: string,
  body: AdminFeatureHighlightInput | FormData,
): Promise<Result<T>> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(await getAuthHeaders()),
    },
    body: isForm ? body : JSON.stringify(body),
  });
  await handleForbidden(res);
  if (res.ok || res.status === 400) {
    const result = (await res.json().catch(() => null)) as Result<T> | null;
    if (result) return result;
  }
  throw new Error(`API error: ${res.status}`);
}

const EMPTY_FEATURE_HIGHLIGHTS: FeatureHighlightsResponse = {
  highlights: [],
  seenHighlightIds: [],
};

async function loadFeatureHighlights(
  path: string,
): Promise<FeatureHighlightsResponse> {
  const result = await apiGet<Result<FeatureHighlightsResponse>>(path);
  if (!result.success) {
    throw new Error(result.message || "Failed to load feature highlights.");
  }
  return result.data ?? EMPTY_FEATURE_HIGHLIGHTS;
}

const LOAD_ONCE_PER_SESSION = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
} as const;

export function unseenFeatureHighlightsQueryOptions(userId: string | null) {
  return queryOptions({
    queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "unseen", userId] as const,
    queryFn: () => loadFeatureHighlights(FEATURE_HIGHLIGHTS_API),
    enabled: !!userId,
    ...LOAD_ONCE_PER_SESSION,
  });
}

async function loadFeatureHighlightTimelinePage(
  before: string | null,
): Promise<FeatureHighlightTimelinePage> {
  const query = before
    ? `?${FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM}=${encodeURIComponent(before)}`
    : "";
  const result = await apiGet<Result<FeatureHighlightTimelinePage>>(
    `${FEATURE_HIGHLIGHTS_TIMELINE_API}${query}`,
  );
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to load feature highlights.");
  }
  return result.data;
}

export function featureHighlightTimelineQueryOptions(userId: string | null) {
  return infiniteQueryOptions({
    queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "timeline", userId] as const,
    queryFn: ({ pageParam }) => loadFeatureHighlightTimelinePage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    enabled: !!userId,
    staleTime: FEATURE_HIGHLIGHT_TIMELINE_STALE_MS,
  });
}

export async function markFeatureHighlightsSeen(
  highlightIds: string[],
): Promise<void> {
  const body: MarkFeatureHighlightsSeenRequest = {
    highlightIds: highlightIds.slice(0, FEATURE_HIGHLIGHT_SEEN_MAX_IDS),
  };
  const result = await apiPost<Result<unknown>>(
    FEATURE_HIGHLIGHTS_SEEN_API,
    body,
  );
  if (!result.success) {
    throw new Error(result.message || "Failed to mark highlights as seen.");
  }
}

export const adminFeatureHighlightsQueryOptions = queryOptions({
  queryKey: ADMIN_FEATURE_HIGHLIGHTS_QUERY_KEY,
  queryFn: async () => {
    const result = await apiGet<Result<AdminFeatureHighlight[]>>(
      ADMIN_FEATURE_HIGHLIGHTS_API,
    );
    if (!result.success) {
      throw new Error(result.message || "Failed to load feature highlights.");
    }
    return result.data ?? [];
  },
});

export function createAdminFeatureHighlight(
  input: AdminFeatureHighlightInput,
): Promise<Result<AdminFeatureHighlight>> {
  return adminFeatureHighlightRequest<AdminFeatureHighlight>(
    "POST",
    ADMIN_FEATURE_HIGHLIGHTS_API,
    input,
  );
}

export function updateAdminFeatureHighlight(
  guid: string,
  input: AdminFeatureHighlightInput,
): Promise<Result<AdminFeatureHighlight>> {
  return adminFeatureHighlightRequest<AdminFeatureHighlight>(
    "PUT",
    `${ADMIN_FEATURE_HIGHLIGHTS_API}/${guid}`,
    input,
  );
}

export function deleteAdminFeatureHighlight(
  guid: string,
): Promise<Result<null>> {
  return apiDelete<Result<null>>(`${ADMIN_FEATURE_HIGHLIGHTS_API}/${guid}`);
}

export function uploadFeatureHighlightMedia(
  file: File,
): Promise<Result<UploadedFeatureHighlightMedia>> {
  const formData = new FormData();
  formData.append("file", file);
  return adminFeatureHighlightRequest<UploadedFeatureHighlightMedia>(
    "POST",
    ADMIN_FEATURE_HIGHLIGHT_MEDIA_API,
    formData,
  );
}
