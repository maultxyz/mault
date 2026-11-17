import { EmptyState } from "@/components/empty-state";
import { HotkeyHint } from "@/components/hotkey-hint";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminFoilLabelQueueQueryOptions,
  saveAdminFoilLabel,
} from "@/features/admin/api/foil-labels";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  FOIL_LABEL_PREFETCH_COUNT,
  FOIL_LABEL_QUEUE_REFILL_THRESHOLD,
} from "@/lib/constants/admin";
import type {
  FoilLabelDecision,
  FoilLabelHistoryEntry,
} from "@/lib/interfaces/admin";
import { toast } from "@/lib/toast";
import {
  IconArrowLeft,
  IconPlayerSkipForward,
  IconSparkles,
  IconSquare,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function FoilLabelingManager() {
  const { t } = useTranslation("admin");
  const queueQuery = useQuery(adminFoilLabelQueueQueryOptions);
  const { refetch: refetchQueue, isFetching: isFetchingQueue, dataUpdatedAt: queueFetchedAt } = queueQuery;
  const [history, setHistory] = useState<FoilLabelHistoryEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [lastLabelSavedAt, setLastLabelSavedAt] = useState(0);

  const forgetFailedLabel = (scanId: string, message?: string) => {
    setHistory((entries) => entries.filter((entry) => entry.item.scanId !== scanId));
    setCursor(null);
    toast.error(message || t("foilLabels.toasts.saveError"));
  };

  const saveMutation = useMutation({
    mutationFn: saveAdminFoilLabel,
    onMutate: () => setPendingSaveCount((count) => count + 1),
    onSettled: () => setPendingSaveCount((count) => count - 1),
    onSuccess: (result, request) => {
      if (!result.success) {
        forgetFailedLabel(request.scanId, result.message);
        return;
      }
      setLastLabelSavedAt(Date.now());
    },
    onError: (_error, request) => forgetFailedLabel(request.scanId),
  });

  const decidedScanIds = useMemo(
    () => new Set(history.map((entry) => entry.item.scanId)),
    [history],
  );
  const upcoming = useMemo(
    () =>
      (queueQuery.data?.items ?? []).filter(
        (item) => !decidedScanIds.has(item.scanId),
      ),
    [queueQuery.data, decidedScanIds],
  );
  const revisiting = cursor === null ? null : history[cursor];
  const current = revisiting?.item ?? upcoming[0] ?? null;

  const needsRefill =
    upcoming.length < FOIL_LABEL_QUEUE_REFILL_THRESHOLD &&
    lastLabelSavedAt > queueFetchedAt;
  useEffect(() => {
    if (needsRefill && !isFetchingQueue) void refetchQueue();
  }, [needsRefill, isFetchingQueue, refetchQueue]);
  const isLoadingMore =
    !current && (needsRefill || pendingSaveCount > 0 || isFetchingQueue);

  useEffect(() => {
    for (const item of upcoming.slice(1, 1 + FOIL_LABEL_PREFETCH_COUNT)) {
      if (item.capturedImageUrl) new Image().src = item.capturedImageUrl;
    }
  }, [upcoming]);

  const sessionFoilCount = history.filter((entry) => entry.decision === "foil").length;
  const sessionNotFoilCount = history.filter((entry) => entry.decision === "notFoil").length;

  const decide = (decision: FoilLabelDecision) => {
    if (!current) return;
    const index = cursor ?? history.length;
    const nextCursor = cursor !== null && cursor + 1 < history.length ? cursor + 1 : null;
    if (decision === "skipped" && revisiting) {
      setCursor(nextCursor);
      return;
    }
    setHistory((entries) => {
      const next = [...entries];
      next[index] = { item: current, decision };
      return next;
    });
    setCursor(nextCursor);
    if (decision === "skipped") return;
    saveMutation.mutate({ scanId: current.scanId, isFoil: decision === "foil" });
  };

  const goBack = () => {
    const index = (cursor ?? history.length) - 1;
    if (index >= 0) setCursor(index);
  };

  useHotkeys({
    foilLabelFoil: () => decide("foil"),
    foilLabelNotFoil: () => decide("notFoil"),
    foilLabelSkip: () => decide("skipped"),
    foilLabelBack: goBack,
  });

  const counts = queueQuery.data?.counts;

  return (
    <SettingsSection
      heading={t("foilLabels.heading")}
      description={t("foilLabels.description")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/70">
          {counts && (
            <span>
              {t("foilLabels.counts", {
                remaining: counts.remaining,
                foil: counts.labelledFoil,
                notFoil: counts.labelledNotFoil,
              })}
            </span>
          )}
          <span>
            {t("foilLabels.sessionCounts", {
              foil: sessionFoilCount,
              notFoil: sessionNotFoilCount,
            })}
          </span>
        </div>

        {queueQuery.isPending || isLoadingMore ? (
          <div className="flex flex-col gap-3 md:flex-row">
            <Skeleton className="aspect-square w-full max-w-sm rounded-lg" />
            <Skeleton className="h-40 w-full max-w-48 rounded-lg" />
          </div>
        ) : !current ? (
          <EmptyState
            icon={IconSparkles}
            title={t("foilLabels.empty.title")}
            description={t("foilLabels.empty.description")}
            action={
              <div className="flex gap-1.5">
                {history.length > 0 && (
                  <Button variant="outline" onClick={goBack}>
                    <IconArrowLeft />
                    {t("foilLabels.actions.back")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={isFetchingQueue}
                  onClick={() => void refetchQueue()}
                >
                  {t("foilLabels.actions.refresh")}
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <figure className="flex w-full max-w-sm flex-col gap-1.5">
                {current.capturedImageUrl ? (
                  <img
                    key={current.scanId}
                    src={current.capturedImageUrl}
                    alt={t("foilLabels.scanPhotoAlt", { name: current.cardName ?? "" })}
                    className="aspect-square w-full rounded-lg object-contain ring-1 ring-border"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-lg ring-1 ring-border" />
                )}
                <figcaption className="text-2xs text-foreground/70">
                  {t("foilLabels.scanPhoto")}
                </figcaption>
              </figure>
              <div className="flex flex-col gap-3">
                {current.catalogImageUrl && (
                  <figure className="flex w-36 flex-col gap-1.5">
                    <img
                      src={current.catalogImageUrl}
                      alt={t("foilLabels.catalogImageAlt", { name: current.cardName ?? "" })}
                      className="w-full rounded-lg ring-1 ring-border"
                    />
                    <figcaption className="text-2xs text-foreground/70">
                      {t("foilLabels.catalogImage")}
                    </figcaption>
                  </figure>
                )}
                <dl aria-live="polite" className="flex flex-col gap-1 text-xs">
                  <dt className="text-sm font-medium">
                    {current.cardName ?? t("foilLabels.unknownCard")}
                  </dt>
                  <dd className="text-foreground/70">
                    {[current.setName ?? current.setCode, current.collectorNumber]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                  <dd className="text-foreground/70">
                    {[current.orgName, current.collectionName, current.gameKey]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                  <dd className="text-foreground/70">
                    {t("foilLabels.savedAs", {
                      foilType: current.savedFoilType ?? t("foilLabels.foil"),
                    })}
                  </dd>
                  <dd className="text-foreground/70">
                    {current.foilScore === null
                      ? t("foilLabels.noDetection")
                      : t(
                          current.foilDetectionMethod === "nudge"
                            ? "foilLabels.nudgeScore"
                            : "foilLabels.detectionScore",
                          { score: current.foilScore.toFixed(2) },
                        )}
                  </dd>
                </dl>
                {revisiting && (
                  <Badge variant="outline" className="self-start">
                    {t(`foilLabels.decisions.${revisiting.decision}`)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button onClick={() => decide("foil")}>
                <IconSparkles />
                {t("foilLabels.actions.foil")}
                <HotkeyHint id="foilLabelFoil" />
              </Button>
              <Button variant="outline" onClick={() => decide("notFoil")}>
                <IconSquare />
                {t("foilLabels.actions.notFoil")}
                <HotkeyHint id="foilLabelNotFoil" />
              </Button>
              <Button variant="ghost" onClick={() => decide("skipped")}>
                <IconPlayerSkipForward />
                {t("foilLabels.actions.skip")}
                <HotkeyHint id="foilLabelSkip" />
              </Button>
              <Button
                variant="ghost"
                disabled={(cursor ?? history.length) === 0}
                onClick={goBack}
              >
                <IconArrowLeft />
                {t("foilLabels.actions.back")}
                <HotkeyHint id="foilLabelBack" />
              </Button>
            </div>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
