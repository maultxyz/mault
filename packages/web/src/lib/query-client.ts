import { QUERY_INVALIDATION_EXCLUDED_KEYS } from "@/lib/constants/query";
import { QueryClient } from "@tanstack/react-query";

export function invalidateAppQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      !QUERY_INVALIDATION_EXCLUDED_KEYS.has(query.queryKey[0] as string),
  });
}

export const publicQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
    },
  },
});
