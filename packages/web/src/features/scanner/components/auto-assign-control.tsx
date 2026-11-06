import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AutoAssignSnapshot } from "@/features/bins/components/auto-assign-snapshot";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AutoAssignControl() {
  const { t } = useTranslation("scanner");
  const { t: tBins } = useTranslation("bins");
  const {
    selectedSet,
    configs,
    fieldDefinitions,
    isPresetMutating,
    resetAutoAssign,
  } = useBinConfigs();
  const { isTimerActive } = useScannedCards();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const autoAssignField = selectedSet?.isActive
    ? selectedSet.autoAssignField
    : null;
  if (!autoAssignField) return null;

  const fieldLabel =
    fieldDefinitions.find((field) => field.field === autoAssignField)?.label ??
    autoAssignField;
  const assignableBins = configs.filter((config) => !config.isCatchAll);
  const claimedBinCount = assignableBins.filter(
    (config) => config.rules.conditions.length > 0,
  ).length;

  const resetButton = (
    <Button
      type="button"
      variant="outline"
      disabled={isPresetMutating || isTimerActive || claimedBinCount === 0}
      onClick={() => setResetDialogOpen(true)}
    >
      <IconRefresh />
      {tBins("autoAssignPanel.reset")}
    </Button>
  );

  return (
    <div className="rounded-lg border p-2 flex items-center justify-between gap-2 flex-none">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium">
          {tBins("autoAssignPanel.heading")}
        </span>
        <span className="text-xs text-foreground/70">
          {t("autoAssignControl.summary", {
            claimed: claimedBinCount,
            total: assignableBins.length,
            field: fieldLabel,
          })}
        </span>
      </div>
      {isTimerActive ? (
        <Tooltip>
          <TooltipTrigger render={<div />}>
            {resetButton}
            <span className="sr-only">{t("autoAssignControl.stopFirst")}</span>
          </TooltipTrigger>
          <TooltipContent>{t("autoAssignControl.stopFirst")}</TooltipContent>
        </Tooltip>
      ) : (
        resetButton
      )}
      <DeleteDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={tBins("autoAssignPanel.resetConfirmTitle")}
        description={tBins("autoAssignPanel.resetConfirmDescription")}
        confirmLabel={tBins("autoAssignPanel.reset")}
        onConfirm={resetAutoAssign}
      >
        <AutoAssignSnapshot />
      </DeleteDialog>
    </div>
  );
}
