import type { QueryClient } from "@tanstack/react-query";

const EXCLUDED_KEYS = new Set(["games", "admin", "announcements"]);

export function invalidateAppQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => !EXCLUDED_KEYS.has(query.queryKey[0] as string),
  });
}
