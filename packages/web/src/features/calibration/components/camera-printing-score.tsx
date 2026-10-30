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
import { scorePrintingFrame } from "@/features/calibration/lib/score-printing-frame";
import {
  cardSetsQueryOptions,
  setPrintingsQueryOptions,
} from "@/features/cards/api/card-sets";
import { useCollections } from "@/features/collections/api/use-collections";
import type { CameraPrintingScoreProps } from "@/lib/interfaces/calibration";
import {
  printingScoreSchema,
  type PrintingScoreFormValues,
} from "@/schemas/printing-score.schema";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DISTANCE_THRESHOLD,
  type CardSetOption,
  type PrintingScoreResult,
  type SetPrintingOption,
} from "@magic-vault/shared";
import { IconFocus2, IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

function formatDistance(distance: number): string {
  return distance.toFixed(3);
}

function printingLabel(card: SetPrintingOption): string {
  return card.collectorNumber ? `${card.name} ${card.collectorNumber}` : card.name;
}

export function CameraPrintingScore({
  canvasRef,
  region,
  checkBothOrientations,
  canCapture,
  className,
}: CameraPrintingScoreProps) {
  const { t } = useTranslation("calibration");
  const { activeCollection } = useCollections();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<PrintingScoreResult | null>(null);
  const threshold = DISTANCE_THRESHOLD.toFixed(2);
  const collectionGuid = activeCollection?.guid;

  const form = useForm<PrintingScoreFormValues>({
    resolver: zodResolver(printingScoreSchema),
    defaultValues: { setCode: "", cardId: "" },
  });
  const { reset, setValue, control, handleSubmit, formState } = form;
  const setCode = useWatch({ control, name: "setCode" });
  const setsQuery = useQuery(
    cardSetsQueryOptions(open ? collectionGuid : undefined),
  );
  const printingsQuery = useQuery(
    setPrintingsQueryOptions(open ? collectionGuid : undefined, setCode || undefined),
  );
  const sets = setsQuery.data ?? [];
  const printings = printingsQuery.data ?? [];

  useEffect(() => {
    reset({ setCode: "", cardId: "" });
    setResult(null);
    setFailed(false);
  }, [collectionGuid, reset]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const draw = () => {
      const source = canvasRef.current;
      const dest = previewRef.current;
      if (source && dest && source.width > 0 && source.height > 0) {
        if (dest.width !== source.width) dest.width = source.width;
        if (dest.height !== source.height) dest.height = source.height;
        dest.getContext("2d")?.drawImage(source, 0, 0);
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
    setResult(null);
    setIsRating(true);
    try {
      setResult(
        await scorePrintingFrame({
          canvas,
          region,
          checkBothOrientations,
          collectionGuid,
          values,
        }),
      );
    } catch {
      setFailed(true);
    } finally {
      setIsRating(false);
    }
  });

  const card = result?.card ?? null;
  const nearest = result?.nearest ?? null;
  const showNearest = !!nearest && nearest.id !== card?.id;
  const accepted = result?.verdict === "accept";

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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("cameraPrintingScore.heading")}</DialogTitle>
            {activeCollection?.game?.name && (
              <DialogDescription>{activeCollection.game.name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border bg-background">
              <canvas ref={previewRef} className="absolute inset-0 h-full w-full object-contain" />
              {!canCapture && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <p className="text-xs text-foreground/70">
                    {t("cameraPrintingScore.noCamera")}
                  </p>
                </div>
              )}
            </div>
            <form className="flex flex-col gap-2" onSubmit={onSubmit}>
              <p className="text-xs text-foreground/70">
                {t("cameraPrintingScore.description", { threshold })}
              </p>
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
                        setResult(null);
                      }}
                      itemToStringLabel={(set: CardSetOption) =>
                        `${set.name} ${set.code}`
                      }
                      isItemEqualToValue={(a: CardSetOption, b: CardSetOption) =>
                        a?.code === b?.code
                      }
                    >
                      <ComboboxInput
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
                        setResult(null);
                      }}
                      itemToStringLabel={printingLabel}
                      isItemEqualToValue={(
                        a: SetPrintingOption,
                        b: SetPrintingOption,
                      ) => a?.id === b?.id}
                    >
                      <ComboboxInput
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
                <p className="text-2xs text-destructive">
                  {t("cameraPrintingScore.fieldsRequired")}
                </p>
              )}
              {!activeCollection && (
                <p className="text-2xs text-foreground/70">
                  {t("cameraPrintingScore.noCollection")}
                </p>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={isRating || !activeCollection || !canCapture}
              >
                {isRating && (
                  <IconLoader2 className="animate-spin motion-reduce:animate-none" />
                )}
                {isRating
                  ? t("cameraPrintingScore.rating")
                  : t("cameraPrintingScore.rate")}
              </Button>
              {failed && (
                <Callout variant="error">{t("cameraPrintingScore.failed")}</Callout>
              )}
              {result && !result.found && (
                <Callout variant="warning">{t("cameraPrintingScore.notSynced")}</Callout>
              )}
              {result && card && (
                <div className="flex items-start gap-2">
                  {card.image?.small && (
                    <img
                      src={card.image.small}
                      alt={card.name}
                      className="w-16 rounded-md"
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-xs font-medium">
                      {t("cameraPrintingScore.cardLine", {
                        name: card.name,
                        set: card.set,
                        number: card.collectorNumber,
                      })}
                    </p>
                    <p className="text-xs">
                      {t("cameraPrintingScore.distanceLabel")}:{" "}
                      {formatDistance(card.distance)}
                    </p>
                    <Callout variant={accepted ? "success" : "warning"}>
                      {t(`cameraPrintingScore.verdict.${result.verdict}`, { threshold })}
                    </Callout>
                  </div>
                </div>
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
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
