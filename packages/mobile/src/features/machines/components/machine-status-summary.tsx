import { isMachineStatusStale, type MachineRunState } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { useMachineLabels } from "@/features/machines/api/use-machine-labels";
import { useTheme } from "@/hooks/use-theme";
import { MACHINE_STATUS_DOT_SIZE } from "@/lib/constants/machines";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { MachinePanelProps } from "@/lib/interfaces/machines";
import type { ThemeColors } from "@/lib/interfaces/theme";

function runStateDotColor(runState: MachineRunState, colors: ThemeColors): string {
  if (runState === "running") return colors.success;
  if (runState === "paused") return colors.warning;
  if (runState === "attention") return colors.destructive;
  return colors.mutedForeground;
}

export function MachineStatusSummary({ machine }: MachinePanelProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { statusLabel } = useMachineLabels();
  const isStale = isMachineStatusStale(machine, Date.now());
  const summary = [
    t(`machines.runState.${machine.runState}`),
    t("machines.sessionCount", { count: machine.sessionScanCount }),
    ...(isStale ? [t("machines.stale")] : []),
  ].join(" · ");

  return (
    <View style={{ gap: SPACING.sm }}>
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={summary}
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}
      >
        <View
          style={{
            width: MACHINE_STATUS_DOT_SIZE,
            height: MACHINE_STATUS_DOT_SIZE,
            borderRadius: RADIUS.full,
            backgroundColor: runStateDotColor(machine.runState, colors),
          }}
        />
        <AppText size="sm" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
          {summary}
        </AppText>
      </View>
      <AppText size="xs" tone="secondary" numberOfLines={1}>
        {[
          machine.collectionName
            ? t("machines.collection", { name: machine.collectionName })
            : t("machines.noCollection"),
          t(`machines.source.${machine.source}`),
        ].join(" · ")}
      </AppText>
      {machine.attention ? (
        <Callout tone="destructive" title={statusLabel(machine)} description={machine.attention.detail} />
      ) : null}
    </View>
  );
}
