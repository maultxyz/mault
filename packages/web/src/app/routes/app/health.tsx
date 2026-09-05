import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { healthQueryOptions } from "@/features/health/api/health";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function HealthPage() {
  const { t } = useTranslation("health");
  const { data, isFetching, isLoading, refetch } = useQuery(
    healthQueryOptions,
  );

  return (
    <div className="overflow-y-auto h-full w-full">
      <div className="flex flex-col p-4 md:p-6 max-w-2xl mx-auto w-full gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold font-heading">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <IconRefresh
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
        </div>

        {data && (
          <div
            className={`rounded-lg border p-4 flex items-center gap-3 ${
              data.healthy
                ? "border-green-500/30 bg-green-400/10"
                : "border-red-500/30 bg-red-400/10"
            }`}
          >
            {data.healthy ? (
              <IconCircleCheck className="size-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <IconAlertTriangle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {data.healthy ? t("allHealthy") : t("someUnhealthy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("lastChecked", {
                  time: new Date(data.checkedAt).toLocaleTimeString(),
                })}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border divide-y">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">
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
                    check.status === "ok" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm truncate">{check.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {check.status === "error" && check.message && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {check.message}
                  </span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("latency", { ms: check.latencyMs })}
                </span>
                <Badge variant={check.status === "ok" ? "success" : "destructive"}>
                  {check.status === "ok" ? t("statusOk") : t("statusError")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
