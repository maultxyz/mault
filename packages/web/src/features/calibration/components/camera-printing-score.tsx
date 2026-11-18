import { Progress } from "@/components/ui/progress";
import { CardImage } from "@/components/card-image";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { printingMatchScore } from "@/features/calibration/lib/printing-match-score";
import { scorePrintingFrame } from "@/features/calibration/lib/score-printing-frame";
import {
  cardSetsQueryOptions,
  setPrintingsQueryOptions,
} from "@/features/cards/api/card-sets";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { CameraFocusControl } from "@/features/scanner/components/camera-focus-control";
import { CameraZoomControl } from "@/features/scanner/components/camera-zoom-control";
import {
  drawDetectionOverlay,
  drawScanRegionMask,
} from "@/features/scanner/lib/card-detection";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import {
  ScanDiagnosticRows,
  ScanDiagnosticsSections,
  TechnicalDetailRow,
} from "@/features/cards/components/scan-diagnostics-details";
import {
  PRINTING_SCORE_DEFAULT_PREVIEW_ASPECT_RATIO,
  PRINTING_SCORE_FORM_ID,
  PRINTING_SCORE_RESULTS_HEADING_ID,
} from "@/lib/constants/calibration";
import type {
  CameraPrintingScoreProps,
  PrintingFrameScanCheck,
  PrintingFrameScore,
} from "@/lib/interfaces/calibration";
import {
  printingScoreSchema,
  type PrintingScoreFormValues,
} from "@/schemas/printing-score.schema";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DISTANCE_THRESHOLD,
  OCR_REGIONS_BY_GAME_KEY,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
  type CardSetOption,
  type OcrDiagnostics,
  type SetPrintingOption,
} from "@magic-vault/shared";
import { IconFocus2, IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

function formatDistance(distance: number): string {
  return distance.toFixed(3);
}

function printingLabel(card: SetPrintingOption): string {
  return card.collectorNumber ? `${card.name} ${card.collectorNumber}` : card.name;
}

function ocrReadoutText(ocr: OcrDiagnostics | null): string {
  if (!ocr) return "";
  return [ocr.readout.name, ocr.readout.setLine, ocr.readout.number]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ");
}

function drawCropBorder(
  canvas: HTMLCanvasElement,
  scanCheck: PrintingFrameScanCheck,
): void {
  if (canvas.width !== scanCheck.frameWidth || canvas.height !== scanCheck.frameHeight) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  if (scanCheck.cardDetected) {
    drawDetectionOverlay(context, {
      detected: true,
      contour: scanCheck.cropContour,
      confidence: 1,
    });
  } else {
    drawScanRegionMask(context, scanCheck.cropContour);
  }
}

function scanCheckVerdictKey(scanCheck: PrintingFrameScanCheck, cardId: string): string {
  if (!scanCheck.card) return "scanCheck.noMatch";
  if (scanCheck.card.id !== cardId) return "scanCheck.otherCard";
  return scanCheck.matched?.matchedBy === "ocr"
    ? "scanCheck.acceptByText"
    : "scanCheck.acceptByImage";
}

export function CameraPrintingScore({
  canvasRef,
  region,
  checkBothOrientations,
  canCapture,
  showCameraControls,
  className,
}: CameraPrintingScoreProps) {
  const { t } = useTranslation("calibration");
  const { activeCollection } = useCollections();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(activeOrg?.id));
  const gameKey = activeCollection?.game?.key;
  const ocrSupported = (OCR_REGIONS_BY_GAME_KEY[gameKey ?? ""]?.length ?? 0) > 0;
  const { zoomRange, focusRange } = useCameraContext();
  const hasCameraControls = showCameraControls && (!!zoomRange || !!focusRange);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [previewAspectRatio, setPreviewAspectRatio] = useState(
    PRINTING_SCORE_DEFAULT_PREVIEW_ASPECT_RATIO,
  );
  const [isRating, setIsRating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [frameScore, setFrameScore] = useState<PrintingFrameScore | null>(null);
  const scanCheckRef = useRef<PrintingFrameScanCheck | null>(null);
  scanCheckRef.current = frameScore?.scanCheck ?? null;
  const threshold = DISTANCE_THRESHOLD.toFixed(2);
  const collectionGuid = activeCollection?.guid;

  const form = useForm<PrintingScoreFormValues>({
    resolver: zodResolver(printingScoreSchema),
    defaultValues: {
      setCode: "",
      cardId: "",
      ocrEnabled: false,
      highAccuracyScans: false,
    },
  });
  const { setValue, control, handleSubmit, formState } = form;
  const setCode = useWatch({ control, name: "setCode" });
  const ocrEnabled = useWatch({ control, name: "ocrEnabled" });
  const highAccuracyScans = useWatch({ control, name: "highAccuracyScans" });
  const ocrMode = scanOcrMode(
    { ocrEnabled, highAccuracyScans },
    ocrSupported,
    readsPrintedLanguageEveryScan(activeCollection, gameKey),
  );
  const setsQuery = useQuery(
    cardSetsQueryOptions(open ? collectionGuid : undefined),
  );
  const printingsQuery = useQuery(
    setPrintingsQueryOptions(open ? collectionGuid : undefined, setCode || undefined),
  );
  const sets = setsQuery.data ?? [];
  const printings = printingsQuery.data ?? [];

  useEffect(() => {
    setValue("setCode", "");
    setValue("cardId", "");
    setFrameScore(null);
    setFailed(false);
  }, [collectionGuid, setValue]);

  const orgOcrEnabled = orgSettings?.ocrEnabled;
  const orgHighAccuracyScans = orgSettings?.highAccuracyScans;
  useEffect(() => {
    if (orgOcrEnabled === undefined || orgHighAccuracyScans === undefined) return;
    setValue("ocrEnabled", orgOcrEnabled);
    setValue("highAccuracyScans", orgHighAccuracyScans);
  }, [orgOcrEnabled, orgHighAccuracyScans, setValue]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const draw = () => {
      const source = canvasRef.current;
      const dest = previewRef.current;
      if (source && dest && source.width > 0 && source.height > 0) {
        if (dest.width !== source.width || dest.height !== source.height) {
          dest.width = source.width;
          dest.height = source.height;
          setPreviewAspectRatio(source.width / source.height);
        }
        dest.getContext("2d")?.drawImage(source, 0, 0);
        if (scanCheckRef.current) {
          drawCropBorder(dest, scanCheckRef.current);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [open, canvasRef]);

  const onSubmit = handleSubmit(async (values) => {
    const canvas = canvasRef.current;
    if (!canvas || !collectionGuid || canvas.width === 0) return;
    setFailed(false);
    setFrameScore(null);
    setIsRating(true);
    try {
      setFrameScore(
        await scorePrintingFrame({
          canvas,
          region,
          checkBothOrientations,
          collectionGuid,
          gameKey,
          ocrMode,
          values,
        }),
      );
    } catch {
      setFailed(true);
    } finally {
      setIsRating(false);
    }
  });

  const result = frameScore?.score ?? null;
  const scanCheck = frameScore?.scanCheck ?? null;
  const scanCheckOcr = scanCheck?.matched?.ocr ?? scanCheck?.unmatched?.ocr ?? null;
  const scanCheckReadout = ocrReadoutText(scanCheckOcr);
  const scanCheckVerdict =
    scanCheck && result?.card
      ? t(`cameraPrintingScore.${scanCheckVerdictKey(scanCheck, result.card.id)}`, {
          name: scanCheck.card?.name,
          set: scanCheck.card?.set,
          number: scanCheck.card?.collectorNumber,
        })
      : null;
  const scanCheckAccepted = !!scanCheck?.card && scanCheck.card.id === result?.card?.id;
  const card = result?.card ?? null;
  const nearest = result?.nearest ?? null;
  const showNearest = !!nearest && nearest.id !== card?.id;
  const matchScore = card
    ? printingMatchScore(card.distance, result?.distanceThreshold ?? DISTANCE_THRESHOLD)
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("w-full", className)}
        onClick={() => setOpen(true)}
      >
        <IconFocus2 />
        {t("cameraPrintingScore.heading")}
      </Button>
      <Dialog drawerOnMobile={false} open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto sm:w-fit sm:max-w-[96vw] md:overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("cameraPrintingScore.heading")}</DialogTitle>
            {activeCollection?.game?.name && (
              <DialogDescription>{activeCollection.game.name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-4 md:flex-row md:gap-3">
            <div
              style={{ "--preview-aspect": previewAspectRatio } as CSSProperties}
              className="relative flex min-h-64 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted md:aspect-(--preview-aspect) md:h-[min(calc(100dvh-8rem),30rem)] md:max-w-[min(40vw,32rem)] md:min-h-0 md:self-start"
            >
              <canvas
                ref={previewRef}
                className="max-h-[40dvh] w-full object-contain md:size-full md:max-h-none"
              />
              {!canCapture && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-foreground/70">
                    {t("cameraPrintingScore.noCamera")}
                  </p>
                </div>
              )}
              {scanCheck && (
                <p className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-background/85 px-2 py-1 text-2xs backdrop-blur-sm">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-sm border-2",
                      scanCheck.cardDetected
                        ? "border-primary"
                        : "border-white/90 bg-black/40",
                    )}
                  />
                  {scanCheck.cardDetected
                    ? t("cameraPrintingScore.cropBorderDetected")
                    : t("cameraPrintingScore.cropBorderScanRegion")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 md:h-[calc(100dvh-8rem)] md:w-[22rem] md:shrink-0 md:gap-3 md:overflow-y-auto md:pr-1 lg:w-auto lg:flex-row lg:overflow-visible lg:pr-0">
              <form
                id={PRINTING_SCORE_FORM_ID}
                className="flex flex-col gap-4 md:gap-3 lg:min-h-0 lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:pr-1"
                onSubmit={onSubmit}
              >
                <p className="text-xs text-foreground/70">
                  {t("cameraPrintingScore.description", { threshold })}
                </p>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium">
                    {t("cameraPrintingScore.cardSectionHeading")}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <Label>{t("cameraPrintingScore.setLabel")}</Label>
                    <Controller
                      control={control}
                      name="setCode"
                      render={({ field }) => (
                        <Combobox
                          items={sets}
                          value={sets.find((set) => set.code === field.value) ?? null}
                          onValueChange={(set: CardSetOption | null) => {
                            const next = set?.code ?? "";
                            if (next !== field.value) setValue("cardId", "");
                            field.onChange(next);
                            setFrameScore(null);
                          }}
                          itemToStringLabel={(set: CardSetOption) =>
                            `${set.name} ${set.code}`
                          }
                          isItemEqualToValue={(a: CardSetOption, b: CardSetOption) =>
                            a?.code === b?.code
                          }
                        >
                          <ComboboxInput
                            aria-label={t("cameraPrintingScore.setLabel")}
                            className="w-full"
                            placeholder={
                              setsQuery.isLoading
                                ? t("cameraPrintingScore.setsLoading")
                                : t("cameraPrintingScore.setPlaceholder")
                            }
                            disabled={!collectionGuid || setsQuery.isLoading}
                            autoComplete="off"
                          />
                          <ComboboxContent>
                            <ComboboxEmpty>
                              {setsQuery.isLoading
                                ? t("cameraPrintingScore.setsLoading")
                                : t("cameraPrintingScore.noSets")}
                            </ComboboxEmpty>
                            <ComboboxList>
                              {(set: CardSetOption) => (
                                <ComboboxItem key={set.code} value={set}>
                                  <span className="truncate">{set.name}</span>
                                  <span className="ml-auto pl-2 pr-6 text-xs text-foreground/70">
                                    {set.code}
                                  </span>
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{t("cameraPrintingScore.cardLabel")}</Label>
                    <Controller
                      control={control}
                      name="cardId"
                      render={({ field }) => (
                        <Combobox
                          items={printings}
                          value={printings.find((card) => card.id === field.value) ?? null}
                          onValueChange={(card: SetPrintingOption | null) => {
                            field.onChange(card?.id ?? "");
                            setFrameScore(null);
                          }}
                          itemToStringLabel={printingLabel}
                          isItemEqualToValue={(
                            a: SetPrintingOption,
                            b: SetPrintingOption,
                          ) => a?.id === b?.id}
                        >
                          <ComboboxInput
                            aria-label={t("cameraPrintingScore.cardLabel")}
                            className="w-full"
                            placeholder={
                              printingsQuery.isLoading
                                ? t("cameraPrintingScore.cardsLoading")
                                : t("cameraPrintingScore.cardPlaceholder")
                            }
                            disabled={!setCode || printingsQuery.isLoading}
                            autoComplete="off"
                          />
                          <ComboboxContent>
                            <ComboboxEmpty>
                              {printingsQuery.isLoading
                                ? t("cameraPrintingScore.cardsLoading")
                                : t("cameraPrintingScore.noCards")}
                            </ComboboxEmpty>
                            <ComboboxList>
                              {(card: SetPrintingOption) => (
                                <ComboboxItem key={card.id} value={card}>
                                  <span className="truncate">{card.name}</span>
                                  {card.collectorNumber && (
                                    <span className="ml-auto pl-2 pr-6 text-xs text-foreground/70 tabular-nums">
                                      {card.collectorNumber}
                                    </span>
                                  )}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      )}
                    />
                  </div>
                  {(formState.errors.setCode || formState.errors.cardId) && (
                    <p role="alert" className="text-2xs text-destructive">
                      {t("cameraPrintingScore.fieldsRequired")}
                    </p>
                  )}
                  {!activeCollection && (
                    <p className="text-2xs text-foreground/70">
                      {t("cameraPrintingScore.noCollection")}
                    </p>
                  )}
                </section>

                {hasCameraControls && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium">
                      {t("cameraPrintingScore.cameraSectionHeading")}
                    </h3>
                    <div className="flex flex-col gap-3 rounded-lg bg-foreground/6 p-2.5">
                      <CameraZoomControl />
                      <CameraFocusControl />
                    </div>
                  </section>
                )}

                {ocrSupported && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium">
                      {t("cameraPrintingScore.scanSettingsSectionHeading")}
                    </h3>
                    <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {t("cameraPrintingScore.ocrToggleLabel")}
                          </span>
                          <Controller
                            control={control}
                            name="ocrEnabled"
                            render={({ field }) => (
                              <Switch
                                aria-label={t("cameraPrintingScore.ocrToggleLabel")}
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setFrameScore(null);
                                }}
                              />
                            )}
                          />
                        </label>
                        <p className="text-2xs text-foreground/70">
                          {t("cameraPrintingScore.ocrToggleDescription")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {t("cameraPrintingScore.highAccuracyToggleLabel")}
                          </span>
                          <Controller
                            control={control}
                            name="highAccuracyScans"
                            render={({ field }) => (
                              <Switch
                                aria-label={t("cameraPrintingScore.highAccuracyToggleLabel")}
                                checked={field.value}
                                disabled={!ocrEnabled}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setFrameScore(null);
                                }}
                              />
                            )}
                          />
                        </label>
                        <p className="text-2xs text-foreground/70">
                          {t("cameraPrintingScore.highAccuracyToggleDescription")}
                        </p>
                      </div>
                      <p className="text-2xs text-foreground/70">
                        {t("cameraPrintingScore.scanSettingsNotSaved")}
                      </p>
                    </div>
                  </section>
                )}
              </form>

              <section
                aria-labelledby={PRINTING_SCORE_RESULTS_HEADING_ID}
                className="flex flex-col gap-3 lg:min-h-0 lg:w-[26rem] lg:shrink-0"
              >
                <div className="flex flex-col gap-2">
                  <h3
                    id={PRINTING_SCORE_RESULTS_HEADING_ID}
                    className="text-xs font-medium"
                  >
                    {t("cameraPrintingScore.resultsHeading")}
                  </h3>
                  <Button
                    type="submit"
                    form={PRINTING_SCORE_FORM_ID}
                    disabled={isRating || !activeCollection || !canCapture}
                  >
                    {isRating && (
                      <IconLoader2 className="animate-spin motion-reduce:animate-none" />
                    )}
                    {isRating
                      ? t("cameraPrintingScore.rating")
                      : t("cameraPrintingScore.rate")}
                  </Button>
                </div>

                <p role="status" className="sr-only">
                  {result && card
                    ? `${t("cameraPrintingScore.matchScoreLabel")} ${t(
                        "cameraPrintingScore.matchScoreValue",
                        { score: matchScore ?? 0 },
                      )}. ${scanCheckVerdict ?? ""}`
                    : ""}
                </p>

                <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                  {isRating && (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  )}

                  {!isRating && !frameScore && !failed && (
                    <p className="rounded-lg bg-foreground/6 p-3 text-xs text-foreground/70">
                      {t("cameraPrintingScore.resultsEmpty")}
                    </p>
                  )}

                  {failed && (
                    <Callout variant="error">{t("cameraPrintingScore.failed")}</Callout>
                  )}
                  {result && !result.found && (
                    <Callout variant="warning">{t("cameraPrintingScore.notSynced")}</Callout>
                  )}

                  {scanCheck && (
                    <div className="grid grid-cols-2 gap-2">
                      <figure className="flex flex-col gap-1">
                        <CardImage
                          src={scanCheck.scannedImageUrl}
                          alt={t("cameraPrintingScore.scannedImageAlt")}
                          loading="eager"
                          fit="fill"
                          className="aspect-[2.5/3.5] h-auto rounded-md"
                        />
                        <figcaption className="text-2xs text-foreground/70">
                          {t("cameraPrintingScore.scannedImageCaption")}
                        </figcaption>
                      </figure>
                      {card?.image && (
                        <figure className="flex flex-col gap-1">
                          <CardImage
                            src={card.image.normal}
                            placeholderSrc={card.image.small}
                            alt={card.name}
                            loading="eager"
                            className="aspect-[2.5/3.5] h-auto rounded-md"
                          />
                          <figcaption className="text-2xs text-foreground/70">
                            {t("cameraPrintingScore.catalogImageCaption")}
                          </figcaption>
                        </figure>
                      )}
                    </div>
                  )}

                  {result && card && (
                    <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="text-xs font-medium">
                            {t("cameraPrintingScore.cardLine", {
                              name: card.name,
                              set: card.set,
                              number: card.collectorNumber,
                            })}
                          </p>
                          {matchScore !== null && (
                            <>
                              <p className="flex items-baseline gap-1.5">
                                <span className="text-xs">
                                  {t("cameraPrintingScore.matchScoreLabel")}
                                </span>
                                <span className="text-base font-semibold">
                                  {t("cameraPrintingScore.matchScoreValue", {
                                    score: matchScore,
                                  })}
                                </span>
                              </p>
                              <Progress
                                role="meter"
                                aria-label={t("cameraPrintingScore.matchScoreLabel")}
                                aria-valuetext={t("cameraPrintingScore.matchScoreValue", {
                                  score: matchScore,
                                })}
                                value={matchScore}
                              />
                            </>
                          )}
                          <p className="text-2xs text-foreground/70">
                            {t("cameraPrintingScore.distanceLabel")}:{" "}
                            {formatDistance(card.distance)}
                          </p>
                        </div>
                      </div>
                      {matchScore !== null && (
                        <p className="text-2xs text-foreground/70">
                          {t("cameraPrintingScore.matchScoreHelp")}
                        </p>
                      )}
                    </div>
                  )}

                  {scanCheckVerdict && (
                    <Callout variant={scanCheckAccepted ? "success" : "warning"}>
                      {scanCheckVerdict}
                    </Callout>
                  )}

                  {(scanCheckOcr || (showNearest && nearest)) && (
                    <div className="flex flex-col gap-1">
                      {scanCheckOcr && (
                        <p className="text-2xs text-foreground/70">
                          {scanCheckReadout
                            ? t("cameraPrintingScore.textRead", { text: scanCheckReadout })
                            : t("cameraPrintingScore.noTextRead")}
                        </p>
                      )}
                      {showNearest && nearest && (
                        <p className="text-2xs text-foreground/70">
                          {t("cameraPrintingScore.nearestDifferent", {
                            name: nearest.name,
                            set: nearest.set,
                            number: nearest.collectorNumber,
                            distance: formatDistance(nearest.distance),
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {scanCheck?.matched && (
                    <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2.5">
                      <h4 className="text-xs font-medium">
                        {t("cameraPrintingScore.scanDetailsHeading")}
                      </h4>
                      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
                        <TechnicalDetailRow label={t("cameraPrintingScore.matchedByLabel")}>
                          {t(`cameraPrintingScore.matchedBy.${scanCheck.matched.matchedBy}`)}
                        </TechnicalDetailRow>
                        <TechnicalDetailRow label={t("cameraPrintingScore.lowConfidenceLabel")}>
                          {scanCheck.lowConfidenceMatch
                            ? t("cameraPrintingScore.yes")
                            : t("cameraPrintingScore.no")}
                        </TechnicalDetailRow>
                        <ScanDiagnosticRows diagnostics={scanCheck.matched} />
                      </dl>
                      <ScanDiagnosticsSections diagnostics={scanCheck.matched} />
                    </div>
                  )}
                  {scanCheck?.unmatched && (
                    <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2.5">
                      <h4 className="text-xs font-medium">
                        {t("cameraPrintingScore.scanDetailsHeading")}
                      </h4>
                      <UnmatchedDiagnosticsDetails
                        diagnostics={scanCheck.unmatched}
                        className="w-full px-0 py-0"
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
