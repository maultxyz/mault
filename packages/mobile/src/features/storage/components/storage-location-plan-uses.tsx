import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { useStoragePlanUses } from "@/features/storage/api/use-storage-plan-uses";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { StorageLocationPlanUsesProps } from "@/lib/interfaces/storage";

export function StorageLocationPlanUses({ locationGuid }: StorageLocationPlanUsesProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { usesOf, isPending } = useStoragePlanUses();
  if (isPending) return null;
  const uses = usesOf(locationGuid);
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={t("storage.planUses.title")} />
      {uses.length === 0 ? (
        <AppText size="sm" style={{ color: colors.mutedForeground }}>
          {t("storage.planUses.empty")}
        </AppText>
      ) : (
        <ListGroup>
          {uses.map((use) => (
            <ListRow
              key={use.presetGuid}
              icon="rules"
              title={use.presetName}
              subtitle={[
                ...(use.gameName ? [use.gameName] : []),
                t("storage.planUses.position", { position: use.planPosition, total: use.planLength }),
                ...(use.fillingBinNumber != null
                  ? [t("storage.planUses.filling", { bin: use.fillingBinNumber })]
                  : []),
              ].join(" · ")}
              value={use.isActive ? t("storage.planUses.active") : undefined}
            />
          ))}
        </ListGroup>
      )}
    </View>
  );
}
