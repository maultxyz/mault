import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { CorrectionAutoCloseTimer } from "@/features/scanner/components/correction-auto-close-timer";
import type {
  BinCorrectionDialogProps,
  BinCorrectionTileProps,
} from "@/lib/interfaces/scanner";
import { IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function BinTile({ label, bin }: BinCorrectionTileProps) {
  const { t } = useTranslation("scanner");
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-md border bg-muted p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
        {label}
      </span>
      <span className="font-heading text-lg font-semibold">
        {bin != null
          ? t("binCorrection.bin", { number: bin })
          : t("binCorrection.noBinValue")}
      </span>
    </div>
  );
}

export function BinCorrectionDialog({
  correction,
  onMoved,
  onClose,
}: BinCorrectionDialogProps) {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const autoCloseSeconds = orgSettings?.correctionAutoCloseSeconds ?? null;
  const currentBin = correction?.currentBin;
  const targetBin = correction?.targetBin;
  const needsMove = targetBin != null && currentBin !== targetBin;
  const name = correction?.cardName ?? "";

  const title =
    targetBin == null
      ? t("binCorrection.noBin.title", { name })
      : needsMove
        ? t("binCorrection.move.title", { name, to: targetBin })
        : t("binCorrection.staysIn.title", { name, bin: targetBin });
  const description =
    targetBin == null
      ? t("binCorrection.noBin.description")
      : needsMove
        ? currentBin != null
          ? t("binCorrection.move.description", {
              from: currentBin,
              to: targetBin,
            })
          : t("binCorrection.move.descriptionNoBin", { to: targetBin })
        : t("binCorrection.staysIn.description");

  return (
    <DynamicDialog
      open={!!correction}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      className="sm:max-w-md"
      footer={
        needsMove && correction ? (
          <>
            <Button variant="outline" onClick={onClose}>
              {currentBin != null
                ? t("binCorrection.leave", { bin: currentBin })
                : t("binCorrection.notNow")}
            </Button>
            <Button onClick={() => onMoved(correction)}>
              {t("binCorrection.moved", { bin: targetBin })}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>{t("binCorrection.ok")}</Button>
        )
      }
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3">
        {correction && autoCloseSeconds != null && (
          <div className="col-span-full">
            <CorrectionAutoCloseTimer
              key={correction.id}
              seconds={autoCloseSeconds}
              willMove={needsMove}
              onElapsed={() => (needsMove ? onMoved(correction) : onClose())}
            />
          </div>
        )}
        <BinTile label={t("binCorrection.currentLabel")} bin={currentBin} />
        <IconArrowRight className="size-4 shrink-0 text-foreground/70" />
        <BinTile label={t("binCorrection.targetLabel")} bin={targetBin} />
      </div>
    </DynamicDialog>
  );
}
