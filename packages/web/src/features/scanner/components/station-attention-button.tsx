import { Button } from "@/components/ui/button";
import { useNextSorterNeedingAttention } from "@/features/scanner/api/use-next-sorter-needing-attention";
import { useStations } from "@/features/scanner/api/use-stations";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StationAttentionButton() {
  const { t } = useTranslation("scanner");
  const { stationIdsNeedingAttention, activeStationId } = useStations();
  const { goToNextSorterNeedingAttention } = useNextSorterNeedingAttention();
  const otherStationsNeedingAttention = stationIdsNeedingAttention.filter(
    (id) => id !== activeStationId,
  ).length;

  if (!goToNextSorterNeedingAttention || otherStationsNeedingAttention === 0) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      className="shrink-0 text-destructive"
      title={t("stations.attention.goToNext")}
      onClick={goToNextSorterNeedingAttention}
    >
      <IconAlertTriangle />
      {t("stations.attention.count", { count: otherStationsNeedingAttention })}
    </Button>
  );
}
