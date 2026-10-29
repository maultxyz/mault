import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { createDefaultBinRoutes, DEFAULT_MODULE_COUNT } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { binRoutesQueryOptions } from "@/features/devices/api/devices";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { BIN_SLOTS_PHYSICAL_ORDER } from "@/lib/constants/calibration";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { BinLocationDiagramProps } from "@/lib/interfaces/cards";

export function BinLocationDiagram({ binNumber }: BinLocationDiagramProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const sorter = useSorter();
  const { bins } = useRulesData();
  const deviceGuid = sorter.device?.guid ?? null;
  const { data } = useQuery(binRoutesQueryOptions(deviceGuid));
  const routes = data ?? createDefaultBinRoutes(sorter.device?.moduleCount ?? DEFAULT_MODULE_COUNT);
  const catchAllBin = bins.find((bin) => bin.isCatchAll)?.binNumber;
  const modules = [...new Set(routes.filter((r) => r.direction !== "bottom").map((r) => r.module))].sort((a, b) => a - b);
  const bottomRoutes = routes.filter((r) => r.direction === "bottom");

  const cell = (slotBin: number, key: string) => {
    const active = slotBin === binNumber;
    return (
      <View
        key={key}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: SPACING.sm + 2,
          backgroundColor: active ? colors.primary : "transparent",
        }}
      >
        <AppText size="sm" weight="semibold" style={{ color: active ? colors.primaryForeground : colors.foregroundSecondary }}>
          {t("rules.bin", { number: slotBin })}
        </AppText>
        {catchAllBin === slotBin ? (
          <AppText size="2xs" style={{ color: active ? colors.primaryForeground : colors.foregroundSecondary, opacity: 0.85 }}>
            {t("rules.catchAll")}
          </AppText>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
      {modules.map((module) => (
        <View key={module} style={{ flexDirection: "row" }}>
          {BIN_SLOTS_PHYSICAL_ORDER.map(({ direction }) => {
            const slotBin = routes.find((r) => r.module === module && r.direction === direction)?.binNumber;
            return slotBin !== undefined ? cell(slotBin, direction) : null;
          })}
        </View>
      ))}
      {bottomRoutes.map((route) => (
        <View key={route.binNumber} style={{ flexDirection: "row" }}>
          {cell(route.binNumber, "bottom")}
        </View>
      ))}
    </View>
  );
}
