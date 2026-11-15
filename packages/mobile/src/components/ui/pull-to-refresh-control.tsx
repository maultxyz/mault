import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { PullToRefreshControlProps } from "@/lib/interfaces/ui";

export function PullToRefreshControl({ onRefresh, ...scrollViewProps }: PullToRefreshControlProps) {
  const colors = useTheme();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const refreshFromPull = useCallback(() => {
    setIsPullRefreshing(true);
    void Promise.resolve()
      .then(onRefresh)
      .catch(() => undefined)
      .finally(() => setIsPullRefreshing(false));
  }, [onRefresh]);
  return (
    <RefreshControl
      {...scrollViewProps}
      refreshing={isPullRefreshing}
      onRefresh={refreshFromPull}
      tintColor={colors.primaryText}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />
  );
}
