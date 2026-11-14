import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import {
  CARD_GRID_DENSITIES,
  CARD_SCAN_TIMELINE_OPTIONS,
} from "@/lib/constants/card-grid";
import type { CardDisplayOptionsProps } from "@/lib/interfaces/cards";
import { IconLayoutGrid, IconLayoutList } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardDisplayOptions({
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  groupDuplicates,
  onGroupDuplicatesChange,
  scanTimeline,
  onScanTimelineChange,
}: CardDisplayOptionsProps) {
  const { t } = useTranslation("cards");

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      {viewMode && onViewModeChange && (
        <ButtonGroup className="w-full">
          <Button
            variant={viewMode === "grid" ? "outline-selected" : "outline"}
            aria-pressed={viewMode === "grid"}
            className="flex-1"
            onClick={() => onViewModeChange("grid")}
          >
            <IconLayoutGrid />
            {t("cardToolbar.gridView")}
          </Button>
          <Button
            variant={viewMode === "list" ? "outline-selected" : "outline"}
            aria-pressed={viewMode === "list"}
            className="flex-1"
            onClick={() => onViewModeChange("list")}
          >
            <IconLayoutList />
            {t("cardToolbar.listView")}
          </Button>
        </ButtonGroup>
      )}
      {scanTimeline && onScanTimelineChange && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-foreground/70">
            {t("cardToolbar.scanTimeline")}
          </span>
          <ButtonGroup
            className="w-full"
            aria-label={t("cardToolbar.scanTimeline")}
          >
            {CARD_SCAN_TIMELINE_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={scanTimeline === option ? "outline-selected" : "outline"}
                aria-pressed={scanTimeline === option}
                className="flex-1"
                onClick={() => onScanTimelineChange(option)}
              >
                {t(`cardToolbar.scanTimelineOptions.${option}`)}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}
      {viewMode !== "list" && density && onDensityChange && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-foreground/70">
            {t("cardToolbar.cardSize")}
          </span>
          <ButtonGroup
            className="w-full"
            aria-label={t("cardToolbar.cardSize")}
          >
            {CARD_GRID_DENSITIES.map((option) => (
              <Button
                key={option}
                variant={density === option ? "outline-selected" : "outline"}
                aria-pressed={density === option}
                className="flex-1 capitalize"
                onClick={() => onDensityChange(option)}
              >
                {t(`cardToolbar.densities.${option}`)}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}
      {groupDuplicates !== undefined &&
        onGroupDuplicatesChange &&
        (scanTimeline ?? "off") === "off" && (
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("cardToolbar.groupDuplicates")}</span>
          <Switch
            aria-label={t("cardToolbar.groupDuplicates")}
            checked={groupDuplicates}
            onCheckedChange={onGroupDuplicatesChange}
          />
        </label>
      )}
    </div>
  );
}
