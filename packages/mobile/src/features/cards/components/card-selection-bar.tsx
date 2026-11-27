import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { SPACING } from "@/lib/constants/theme";
import type { CardSelectionBarProps } from "@/lib/interfaces/cards";

export function CardSelectionBar({
  selectedCount,
  allSelected,
  selectingAll,
  actionsDisabled,
  onToggleSelectAll,
  onOpenActions,
}: CardSelectionBarProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold" accessibilityLiveRegion="polite" style={{ flexGrow: 1 }}>
        {t("cardBulk.selectedCount", { count: selectedCount })}
      </AppText>
      <Button
        size="sm"
        variant="ghost"
        label={allSelected ? t("cardBulk.clear") : t("cardBulk.selectAll")}
        loading={selectingAll}
        onPress={onToggleSelectAll}
      />
      <Button
        size="sm"
        variant="secondary"
        icon="more"
        label={t("cardBulk.actions")}
        disabled={selectedCount === 0 || actionsDisabled}
        onPress={onOpenActions}
      />
    </View>
  );
}
