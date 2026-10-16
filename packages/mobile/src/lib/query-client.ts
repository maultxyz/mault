import { QueryClient } from "@tanstack/react-query";
import { QUERY_RETRY_COUNT } from "@/lib/constants/query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: QUERY_RETRY_COUNT, refetchOnWindowFocus: false },
  },
});
