import { MACHINE_BIN_WARNING_PERCENT, machineBinFillPercent } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { useTheme } from "@/hooks/use-theme";
import { MACHINE_BIN_TILE_HALF_WIDTH } from "@/lib/constants/machines";
import { PROGRESS_BAR_HEIGHT } from "@/lib/constants/ui";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { MachineBinTileProps, MachinePanelProps } from "@/lib/interfaces/machines";

function MachineBinTile({ fill, spansFullWidth }: MachineBinTileProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const percent = machineBinFillPercent(fill);
  const name = fill.isCatchAll
    ? t("machines.bins.catchAll", { number: fill.binNumber })
    : t("machines.bins.bin", { number: fill.binNumber });
  const accessibleLabel =
    fill.capacity != null
      ? t("machines.bins.a11y", { name, count: fill.count, capacity: fill.capacity })
      : t("machines.bins.a11yUnknown", { name, count: fill.count });
  const isNearlyFull = percent != null && percent >= MACHINE_BIN_WARNING_PERCENT;

  return (
    <View
      accessible
      accessibilityLabel={accessibleLabel}
      style={{
        width: spansFullWidth ? "100%" : MACHINE_BIN_TILE_HALF_WIDTH,
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm }}>
        <AppText size="sm" numberOfLines={1} style={{ flexShrink: 1 }}>
          {name}
        </AppText>
        <AppText size="sm" weight="semibold">
          {fill.capacity != null
            ? t("machines.bins.fill", { count: fill.count, capacity: fill.capacity })
            : t("machines.bins.fillUnknown", { count: fill.count })}
        </AppText>
      </View>
      <View style={{ height: PROGRESS_BAR_HEIGHT, borderRadius: RADIUS.full, backgroundColor: colors.tonal, overflow: "hidden" }}>
        <View
          style={{
            width: `${percent ?? 0}%`,
            height: "100%",
            borderRadius: RADIUS.full,
            backgroundColor: isNearlyFull ? colors.warning : colors.primary,
          }}
        />
      </View>
    </View>
  );
}

export function MachineBinGrid({ machine }: MachinePanelProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ gap: SPACING.xs }}>
        <SectionHeader title={t("machines.bins.title")} />
        <AppText size="xs" tone="secondary">
          {t("machines.bins.estimated")}
        </AppText>
      </View>
      {machine.binFill && machine.binFill.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: SPACING.sm }}>
          {machine.binFill.map((fill) => (
            <MachineBinTile key={fill.binNumber} fill={fill} spansFullWidth={fill.isCatchAll} />
          ))}
        </View>
      ) : (
        <Surface>
          <AppText size="sm" tone="secondary">
            {t("machines.bins.unavailable")}
          </AppText>
        </Surface>
      )}
    </View>
  );
}
