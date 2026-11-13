import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { QUERY_RETRY_COUNT, QUERY_STALE_MS } from "@/lib/constants/query";

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) => setFocused(state === "active"));
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: QUERY_RETRY_COUNT, refetchOnWindowFocus: false, staleTime: QUERY_STALE_MS },
  },
});
