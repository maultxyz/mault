import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Platform, View } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { QueryErrorStateProps } from "@/lib/interfaces/ui";

export function QueryErrorState({ title, description, onRetry, isRetrying = false }: QueryErrorStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("recovery.loadFailed");
  const resolvedDescription = description ?? t("recovery.loadFailedDescription");
  const announcement = `${resolvedTitle}. ${resolvedDescription}`;
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite">
      <EmptyState
        icon="error"
        title={resolvedTitle}
        description={resolvedDescription}
        action={
          <Button variant="secondary" icon="refresh" label={t("recovery.retry")} loading={isRetrying} onPress={onRetry} />
        }
      />
    </View>
  );
}
