import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { AppState } from "react-native";
import { QUERY_GC_MS, QUERY_RETRY_COUNT, QUERY_STALE_MS } from "@/lib/constants/query";
import { isOnlineNetworkState } from "@/lib/network";

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) => setFocused(state === "active"));
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
  void getNetworkStateAsync()
    .then((state) => setOnline(isOnlineNetworkState(state)))
    .catch(() => {});
  const subscription = addNetworkStateListener((state) => setOnline(isOnlineNetworkState(state)));
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: QUERY_RETRY_COUNT, refetchOnWindowFocus: false, staleTime: QUERY_STALE_MS, gcTime: QUERY_GC_MS },
    mutations: { networkMode: "always" },
  },
});
