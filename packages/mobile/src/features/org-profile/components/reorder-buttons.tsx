import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { IconButton } from "@/components/ui/icon-button";
import { SPACING } from "@/lib/constants/theme";
import type { ReorderButtonsProps } from "@/lib/interfaces/org-profile";

export function ReorderButtons({ itemLabel, isFirst, isLast, disabled, onMoveUp, onMoveDown, onRemove }: ReorderButtonsProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
      <IconButton
        icon="arrowUp"
        variant="plain"
        accessibilityLabel={t("settings.orgProfile.moveUp", { name: itemLabel })}
        disabled={disabled || isFirst}
        onPress={onMoveUp}
      />
      <IconButton
        icon="arrowDown"
        variant="plain"
        accessibilityLabel={t("settings.orgProfile.moveDown", { name: itemLabel })}
        disabled={disabled || isLast}
        onPress={onMoveDown}
      />
      <IconButton
        icon="trash"
        variant="plain"
        accessibilityLabel={t("settings.orgProfile.remove", { name: itemLabel })}
        disabled={disabled}
        onPress={onRemove}
      />
    </View>
  );
}
