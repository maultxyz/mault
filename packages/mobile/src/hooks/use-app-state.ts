import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function useAppState(): AppStateStatus {
  const [state, setState] = useState<AppStateStatus>(() => (AppState.currentState as AppStateStatus | null) ?? "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", setState);
    return () => subscription.remove();
  }, []);
  return state;
}
