import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { IconButton } from "@/components/ui/icon-button";
import {
  pickWalkOrderLabel,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { PickWalkEntryRowProps } from "@/lib/interfaces/business";

export function PickWalkEntryRow({ entry, isPicked, showOrderName, canPick, onToggle, onMissing }: PickWalkEntryRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const spot = pickWalkSpotLabel(entry, t);
  const printing = pickWalkPrintingLabel(entry, t);
  const orderLabel = pickWalkOrderLabel(entry, showOrderName, t);
  const { imageUrl, placeholderUrl } = cardArtSources(entry.card.image);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={[entry.card.name, spot, printing, orderLabel].filter(Boolean).join(", ")}
        accessibilityState={{ checked: isPicked, disabled: !canPick }}
        disabled={!canPick}
        onPress={onToggle}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.md,
          minHeight: LIST_ROW_MIN_HEIGHT,
          paddingLeft: SCREEN_GUTTER,
          paddingVertical: SPACING.sm,
          backgroundColor: pressed ? colors.tonal : "transparent",
        })}
      >
        <CheckboxIndicator checked={isPicked} disabled={!canPick} />
        <CardThumbnail imageUrl={imageUrl} placeholderUrl={placeholderUrl} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText
            weight="medium"
            numberOfLines={1}
            tone={isPicked ? "secondary" : undefined}
            style={isPicked ? { textDecorationLine: "line-through" } : undefined}
          >
            {entry.card.name}
          </AppText>
          <AppText size="xs" weight="semibold" tone={isPicked ? "secondary" : "primary"} numberOfLines={1}>
            {spot}
          </AppText>
          <AppText size="xs" tone="secondary" numberOfLines={2}>
            {printing}
          </AppText>
          {orderLabel ? (
            <AppText size="xs" tone="secondary" numberOfLines={1}>
              {orderLabel}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {canPick && !isPicked ? (
        <View style={{ paddingHorizontal: SPACING.sm }}>
          <IconButton
            icon="warning"
            variant="plain"
            accessibilityLabel={t("business.picks.walk.cantFindCard", { name: entry.card.name })}
            onPress={onMissing}
          />
        </View>
      ) : (
        <View style={{ width: SPACING.lg }} />
      )}
    </View>
  );
}
