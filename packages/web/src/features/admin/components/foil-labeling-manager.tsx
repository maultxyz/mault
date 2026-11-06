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
import { useLabelQueue } from "@/hooks/use-label-queue";
import {
  IconArrowLeft,
  IconPlayerSkipForward,
  IconSparkles,
  IconSquare,
} from "@tabler/icons-react";
import type { FoilLabelDecision } from "@/lib/interfaces/admin";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function FoilLabelingManager() {
  const { t } = useTranslation("admin");
  const queueQuery = useQuery(adminFoilLabelQueueQueryOptions);
  const { refetch: refetchQueue, isFetching: isFetchingQueue } = queueQuery;
  const { current, revisiting, history, decide, skip, goBack, canGoBack, isLoadingMore } =
    useLabelQueue({
      items: queueQuery.data?.items,
      isFetchingQueue,
      queueFetchedAt: queueQuery.dataUpdatedAt,
      refetchQueue,
      saveLabel: (item, decision: FoilLabelDecision) =>
        saveAdminFoilLabel({ scanId: item.scanId, isFoil: decision === "foil" }),
      saveErrorMessage: t("foilLabels.toasts.saveError"),
    });

  const sessionFoilCount = history.filter((entry) => entry.decision === "foil").length;
  const sessionNotFoilCount = history.filter((entry) => entry.decision === "notFoil").length;

  useHotkeys({
    foilLabelFoil: () => decide("foil"),
    foilLabelNotFoil: () => decide("notFoil"),
    foilLabelSkip: skip,
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
              <Button variant="ghost" onClick={skip}>
                <IconPlayerSkipForward />
                {t("foilLabels.actions.skip")}
                <HotkeyHint id="foilLabelSkip" />
              </Button>
              <Button
                variant="ghost"
                disabled={!canGoBack}
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
