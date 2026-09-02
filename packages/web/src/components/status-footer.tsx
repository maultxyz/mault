import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { healthQueryOptions } from "@/features/health/api/health";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useRole } from "@/hooks/use-role";
import { createSyncEventSource } from "@/lib/api/admin";
import type { SyncState } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

export function FooterDivider() {
  return <span className="h-3 w-px bg-border shrink-0" />;
}

const DEFAULT_SYNC_STATE: SyncState = {
  status: "idle",
  gameKey: "",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
  lang: "en",
};

function StatusDot({
  variant,
}: {
  variant: "success" | "warning" | "error" | "muted";
}) {
  const colors = {
    success: "bg-green-500",
    warning: "bg-amber-500 animate-pulse",
    error: "bg-red-500",
    muted: "bg-muted-foreground/30",
  };
  return (
    <span className={`size-1.5 rounded-full shrink-0 ${colors[variant]}`} />
  );
}

function StatusItem({
  label,
  dot,
  tooltip,
}: {
  label: string;
  dot: "success" | "warning" | "error" | "muted";
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-1.5 cursor-default">
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function SyncStatusItem() {
  const { t } = useTranslation("common");
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAdmin } = useRole();

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    async function connect() {
      try {
        es = await createSyncEventSource();
        if (cancelled) {
          es.close();
          return;
        }

        es.addEventListener("status", (e: MessageEvent) => {
          setSyncState(JSON.parse(e.data) as SyncState);
        });
        es.addEventListener("progress", (e: MessageEvent) => {
          setSyncState((prev) => ({ ...prev, ...JSON.parse(e.data) }));
        });
        es.addEventListener("done", (e: MessageEvent) => {
          setSyncState((prev) => ({ ...prev, ...JSON.parse(e.data) }));
        });
        es.addEventListener("error", (e: MessageEvent) => {
          if (e.data) setSyncState((prev) => ({ ...prev, status: "failed" }));
        });
      } catch {}
    }

    connect();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  const { status, total, processed, skipped } = syncState;
  const done = processed + skipped;

  const visible =
    status !== "idle" && status !== "cancelled" && pathname !== "/app/admin";
  if (!visible) return null;

  const dot =
    status === "running"
      ? "warning"
      : status === "completed"
        ? "success"
        : status === "failed"
          ? "error"
          : "muted";

  const countLabel =
    status === "running" && total > 0
      ? t("statusFooter.syncProgress", {
          done: done.toLocaleString(),
          total: total.toLocaleString(),
        })
      : t("statusFooter.syncStatus", { status });

  const tooltip =
    status === "running"
      ? syncState.currentCard
        ? t("statusFooter.syncingCard", { card: syncState.currentCard })
        : t("statusFooter.syncing")
      : status === "completed"
        ? t("statusFooter.syncCompleted")
        : status === "failed"
          ? t("statusFooter.syncFailed")
          : t("statusFooter.sync");

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={isAdmin ? () => navigate("/app/admin") : undefined}
        className={`flex items-center gap-1.5 transition-colors min-w-0 ${
          isAdmin ? "cursor-pointer hover:text-foreground" : "cursor-default"
        }`}
      >
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {countLabel}
        </span>
        {status === "running" && syncState.currentCard && (
          <span className="text-xs text-muted-foreground/70 truncate max-w-32">
            — {syncState.currentCard}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function HealthStatusItem() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data } = useQuery(healthQueryOptions);

  if (pathname === "/app/health") return null;

  const failedChecks = data?.checks.filter((check) => check.status === "error") ?? [];
  const dot = !data ? "muted" : data.healthy ? "success" : "error";
  const label = !data
    ? t("statusFooter.health")
    : data.healthy
      ? t("statusFooter.healthOk")
      : t("statusFooter.healthIssues", { count: failedChecks.length });
  const tooltip = !data
    ? t("statusFooter.healthChecking")
    : data.healthy
      ? t("statusFooter.healthOkTooltip")
      : t("statusFooter.healthIssuesTooltip", {
          names: failedChecks.map((check) => check.name).join(", "),
        });

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => navigate("/app/health")}
        className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
      >
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function StatusFooter() {
  const { t } = useTranslation("common");
  const { status: cameraStatus } = useCameraContext();
  const { isConnected, isReady, firmwareVersion } = useSerial();
  const { cards } = useScannedCards();

  const totalValue = cards.reduce(
    (sum, { card, isFoil }) =>
      sum + ((isFoil ? card.priceFoil : card.price) ?? card.price ?? 0),
    0,
  );

  const cameraDot =
    cameraStatus === "ready"
      ? "success"
      : cameraStatus === "error"
        ? "error"
        : cameraStatus === "requesting"
          ? "warning"
          : "muted";

  const cameraTooltip =
    cameraStatus === "ready"
      ? t("statusFooter.cameraConnected")
      : cameraStatus === "error"
        ? t("statusFooter.cameraError")
        : cameraStatus === "requesting"
          ? t("statusFooter.cameraRequesting")
          : t("statusFooter.cameraNone");

  const deviceDot = !isConnected ? "muted" : !isReady ? "warning" : "success";
  const deviceTooltip = !isConnected
    ? t("statusFooter.sorterDisconnected")
    : !isReady
      ? t("statusFooter.sorterSelfTest")
      : firmwareVersion
        ? t("statusFooter.sorterReadyWithVersion", { version: firmwareVersion })
        : t("statusFooter.sorterReady");
  const deviceLabel =
    isConnected && firmwareVersion
      ? t("statusFooter.sorterWithVersion", { version: firmwareVersion })
      : t("statusFooter.sorter");

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="flex items-center gap-3">
        <StatusItem
          label={t("statusFooter.camera")}
          dot={cameraDot}
          tooltip={cameraTooltip}
        />
        <StatusItem label={deviceLabel} dot={deviceDot} tooltip={deviceTooltip} />
        <SyncStatusItem />
        <HealthStatusItem />
      </div>
      {cards.length > 0 && (
        <>
          <FooterDivider />
          <p className="text-xs tabular-nums">
            {t("statusFooter.cardTotal", {
              count: cards.length,
              value: totalValue.toFixed(2),
            })}
          </p>
        </>
      )}
    </div>
  );
}
