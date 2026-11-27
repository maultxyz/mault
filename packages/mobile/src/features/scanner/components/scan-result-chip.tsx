import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { ScanResultChipProps } from "@/lib/interfaces/scanner";

export function ScanResultChip({ entry, onPress }: ScanResultChipProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const card = entry.card;
  if (!card) return null;
  const price = pricing.priceOf(card);
  const details = [card.setName, price != null ? pricing.format(price) : null].filter(Boolean).join(" · ");
  const checkMatchLabel = entry.lowConfidence ? t("scan.result.checkMatch") : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[card.name, details, checkMatchLabel].filter(Boolean).join(", ")}
      accessibilityHint={t("scan.result.openHint")}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: colors.cameraScrim,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon
        name={entry.lowConfidence ? "warning" : "success"}
        size={16}
        color={entry.lowConfidence ? colors.warning : colors.success}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="sm" weight="semibold" numberOfLines={1} style={{ color: colors.onCamera }}>
          {card.name}
        </AppText>
        {details || checkMatchLabel ? (
          <AppText size="xs" numberOfLines={1} style={{ color: colors.onCamera, opacity: 0.8 }}>
            {[checkMatchLabel, details].filter(Boolean).join(" · ")}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron" size={14} color={colors.onCamera} />
    </Pressable>
  );
}
