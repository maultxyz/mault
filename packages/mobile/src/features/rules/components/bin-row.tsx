import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { overflowSourcesFor, ruleChips } from "@/features/rules/lib/rules";
import { useTheme } from "@/hooks/use-theme";
import { BIN_ROW_MAX_CHIPS } from "@/lib/constants/rules";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { DISABLED_OPACITY, ICON_BADGE_SIZE } from "@/lib/constants/ui";
import type { BinRowProps } from "@/lib/interfaces/rules";

export function BinRow({ bin, bins, fieldDefinitions, onPress }: BinRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const sources = overflowSourcesFor(bin.binNumber, bins);
  const chips = bin.pickList ? [] : ruleChips(bin.rules, fieldDefinitions, t);
  const shownChips = chips.slice(0, BIN_ROW_MAX_CHIPS);
  const hiddenCount = chips.length - shownChips.length;
  const hasTags = bin.isCatchAll || bin.isDisabled || !!bin.pickList || sources.length > 0 || bin.overflowBin != null;
  const empty = chips.length === 0 && !hasTags;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("rules.bin", { number: bin.binNumber })}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SPACING.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <View
        style={{
          width: ICON_BADGE_SIZE,
          height: ICON_BADGE_SIZE,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bin.isCatchAll ? colors.primaryMuted : colors.muted,
          opacity: bin.isDisabled ? DISABLED_OPACITY : 1,
        }}
      >
        <AppText size="sm" weight="bold" style={{ color: bin.isCatchAll ? colors.primaryText : colors.foreground }}>
          {String(bin.binNumber)}
        </AppText>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs + 2 }}>
        <AppText size="base" weight="semibold" style={{ lineHeight: ICON_BADGE_SIZE / 2 + 4, marginTop: 6 }}>
          {t("rules.bin", { number: bin.binNumber })}
        </AppText>
        {empty ? (
          <AppText size="sm" tone="secondary">
            {t("rules.noRulesTapToAdd")}
          </AppText>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs + 2 }}>
            {bin.isCatchAll ? <Pill tone="info" label={t("rules.catchAll")} /> : null}
            {bin.isDisabled ? <Pill tone="warning" label={t("rules.disabled")} /> : null}
            {bin.pickList ? <Pill tone="info" label={t("rules.pickList")} /> : null}
            {sources.length > 0 ? <Pill label={t("rules.overflowFor", { bins: sources.join(", ") })} /> : null}
            {shownChips.map((chip, index) => (
              <View
                key={`${index}-${chip}`}
                style={{
                  maxWidth: "100%",
                  paddingHorizontal: SPACING.sm + 2,
                  paddingVertical: 3,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.muted,
                }}
              >
                <AppText size="xs" weight="medium" numberOfLines={1}>
                  {chip}
                </AppText>
              </View>
            ))}
            {hiddenCount > 0 ? <Pill label={t("rules.moreChips", { count: hiddenCount })} /> : null}
            {bin.overflowBin != null ? (
              <Pill label={t("rules.overflowsTo", { bin: t("rules.bin", { number: bin.overflowBin }) })} />
            ) : null}
          </View>
        )}
      </View>
      <View style={{ height: ICON_BADGE_SIZE, justifyContent: "center" }}>
        <Icon name="chevron" size={16} color={colors.foregroundSecondary} />
      </View>
    </Pressable>
  );
}
