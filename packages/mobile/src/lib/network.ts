import type { NetworkState } from "expo-network";

export function isOnlineNetworkState(state: NetworkState): boolean {
  return state.isConnected !== false;
}
