import { Callout } from "@/components/callout";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameCoverageList } from "@/features/games/components/game-coverage-list";
import { useHealthQuery } from "@/features/health/api/health";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSyncState } from "@/lib/app-stream";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export default function HealthPage() {
  const { t } = useTranslation("health");
  const { t: tGames } = useTranslation("games");
  const { data, isFetching, isLoading, refetch } = useHealthQuery();
  const isSyncing = useSyncState().status === "running";
  const isMobile = useIsMobile();

  const refreshButton = (
    <Button
      size={isMobile ? "sm" : "xs"}
      variant="outline"
      onClick={() => refetch()}
      disabled={isFetching || isSyncing}
    >
      <IconRefresh className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
      {t("refresh")}
    </Button>
  );
  const syncNote = isSyncing && (
    <p className="text-xs text-foreground/70">{t("pausedDuringSync")}</p>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          actions={refreshButton}
        />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto w-full",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="flex flex-col p-4 md:p-6 max-w-2xl mx-auto w-full gap-5">
          {isMobile ? (
            syncNote
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold font-heading">
                  {t("title")}
                </h1>
                <p className="text-xs text-foreground/70">{t("subtitle")}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {refreshButton}
                {syncNote}
              </div>
            </div>
          )}

          {data && (
            <Callout
              variant={data.healthy ? "success" : "error"}
              icon={data.healthy ? IconCircleCheck : IconAlertTriangle}
              title={data.healthy ? t("allHealthy") : t("someUnhealthy")}
            >
              {t("lastChecked", {
                time: new Date(data.checkedAt).toLocaleTimeString(),
              })}
            </Callout>
          )}

          <div className="rounded-lg border divide-y">
            {isLoading && (
              <div className="p-4 text-sm text-foreground/70">
                {t("loading")}
              </div>
            )}
            {data?.checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`size-2 rounded-full shrink-0 ${
                      check.status === "ok" ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  <span className="text-sm truncate">{check.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {check.status === "error" && check.message && (
                    <span className="text-sm text-destructive">
                      {check.message}
                    </span>
                  )}
                  <span className="text-xs text-foreground/70 tabular-nums">
                    {t("latency", { ms: check.latencyMs })}
                  </span>
                  <Badge
                    variant={check.status === "ok" ? "success" : "destructive"}
                  >
                    {check.status === "ok" ? t("statusOk") : t("statusError")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold font-heading">
              {tGames("gameCoverage.heading")}
            </h2>
            <p className="text-sm text-foreground/70 mt-0.5">
              {tGames("gameCoverage.description")}
            </p>
          </div>
          <GameCoverageList />
        </div>
      </div>
    </div>
  );
}
