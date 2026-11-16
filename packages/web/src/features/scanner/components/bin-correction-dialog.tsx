import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { BIN_CORRECTION_CONFIRM_KEYS } from "@/lib/constants/scanner";
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
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

function BinTile({ label, bin }: BinCorrectionTileProps) {
  const { t } = useTranslation("scanner");
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-foreground/6 p-3">
      <span className="text-xs font-medium text-foreground/70">
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
  const [shownCorrection, setShownCorrection] = useState(correction);
  if (correction && correction !== shownCorrection) {
    setShownCorrection(correction);
  }
  const currentBin = shownCorrection?.currentBin;
  const targetBin = shownCorrection?.targetBin;
  const needsMove = targetBin != null && currentBin !== targetBin;
  const name = shownCorrection?.cardName ?? "";
  const isAdded = !!shownCorrection?.addedCard;

  const title =
    targetBin == null
      ? t("binCorrection.noBin.title", { name })
      : isAdded
        ? t("binCorrection.added.title", { name, to: targetBin })
        : needsMove
          ? t("binCorrection.move.title", { name, to: targetBin })
          : t("binCorrection.staysIn.title", { name, bin: targetBin });
  const description =
    targetBin == null
      ? t(
          isAdded
            ? "binCorrection.added.noBinDescription"
            : "binCorrection.noBin.description",
        )
      : isAdded
        ? t("binCorrection.added.description", { to: targetBin })
        : needsMove
          ? currentBin != null
            ? t("binCorrection.move.description", {
                from: currentBin,
                to: targetBin,
              })
            : t("binCorrection.move.descriptionNoBin", { to: targetBin })
          : t("binCorrection.staysIn.description");

  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusMovedInside, setIsFocusMovedInside] = useState(false);
  const [keptOpenCorrectionId, setKeptOpenCorrectionId] = useState<
    string | null
  >(null);
  const correctionId = correction?.id ?? null;
  const showsAutoCloseTimer =
    correctionId != null &&
    autoCloseSeconds != null &&
    keptOpenCorrectionId !== correctionId;

  useEffect(() => {
    if (!showsAutoCloseTimer) return;
    const promptElement =
      contentRef.current?.closest<HTMLElement>('[role="dialog"]') ??
      contentRef.current;
    if (!promptElement) return;
    const handlePointerEnter = () => setIsPointerInside(true);
    const handlePointerLeave = () => setIsPointerInside(false);
    const handleFocusIn = (event: FocusEvent) =>
      setIsFocusMovedInside(event.target !== confirmButtonRef.current);
    const handleFocusOut = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !promptElement.contains(event.relatedTarget)
      )
        setIsFocusMovedInside(false);
    };
    promptElement.addEventListener("pointerenter", handlePointerEnter);
    promptElement.addEventListener("pointerleave", handlePointerLeave);
    promptElement.addEventListener("focusin", handleFocusIn);
    promptElement.addEventListener("focusout", handleFocusOut);
    return () => {
      promptElement.removeEventListener("pointerenter", handlePointerEnter);
      promptElement.removeEventListener("pointerleave", handlePointerLeave);
      promptElement.removeEventListener("focusin", handleFocusIn);
      promptElement.removeEventListener("focusout", handleFocusOut);
      setIsPointerInside(false);
      setIsFocusMovedInside(false);
    };
  }, [showsAutoCloseTimer, correctionId]);

  const confirm = () => {
    if (!correction) return;
    if (needsMove) onMoved(correction);
    else onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!BIN_CORRECTION_CONFIRM_KEYS.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const focusedButton =
      event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (focusedButton && focusedButton !== confirmButtonRef.current) return;
    event.preventDefault();
    if (event.repeat) return;
    confirm();
  };

  return (
    <DynamicDialog
      open={!!correction}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      className="sm:max-w-md"
      onKeyDown={handleKeyDown}
      initialFocusRef={confirmButtonRef}
      footer={
        needsMove && shownCorrection ? (
          <>
            <Button variant="outline" onClick={onClose}>
              {currentBin != null
                ? t("binCorrection.leave", { bin: currentBin })
                : t("binCorrection.notNow")}
              <Kbd>{t("binCorrection.keys.escape")}</Kbd>
            </Button>
            <Button ref={confirmButtonRef} onClick={confirm}>
              {t("binCorrection.moved", { bin: targetBin })}
              <Kbd>{t("binCorrection.keys.enter")}</Kbd>
            </Button>
          </>
        ) : (
          <Button ref={confirmButtonRef} onClick={confirm}>
            {t("binCorrection.ok")}
            <Kbd>{t("binCorrection.keys.enter")}</Kbd>
          </Button>
        )
      }
    >
      <div
        ref={contentRef}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3"
      >
        {showsAutoCloseTimer && autoCloseSeconds != null && (
          <div className="col-span-full">
            <CorrectionAutoCloseTimer
              key={correctionId}
              seconds={autoCloseSeconds}
              willMove={needsMove}
              isPaused={isPointerInside || isFocusMovedInside}
              onElapsed={confirm}
              onKeepOpen={() => {
                setKeptOpenCorrectionId(correctionId);
                confirmButtonRef.current?.focus();
              }}
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
