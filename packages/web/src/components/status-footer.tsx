import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHealthQuery } from "@/features/health/api/health";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useCommLog, useSerial } from "@/features/scanner/api/use-serial";
import { formatCommLog } from "@/features/scanner/lib/comm-log";
import { useRole } from "@/hooks/use-role";
import { useSyncState } from "@/lib/app-stream";
import { LATEST_FIRMWARE_VERSION } from "@/lib/constants/firmware";
import { isFirmwareVersionOutdated } from "@magic-vault/shared";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function FooterDivider() {
  return <span className="h-3 w-px bg-border shrink-0" />;
}

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
  onClick,
}: {
  label: string;
  dot: "success" | "warning" | "error" | "muted";
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        className={`flex items-center gap-1.5 transition-colors ${
          onClick ? "cursor-pointer hover:text-foreground" : "cursor-default"
        }`}
      >
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function SyncStatusItem() {
  const { t } = useTranslation("common");
  const syncState = useSyncState();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAdmin } = useRole();

  const { status, total, processed, skipped } = syncState;
  const done = processed + skipped;

  const visible =
    status !== "idle" &&
    status !== "cancelled" &&
    pathname !== "/app/admin/cards";
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
      ? t("statusFooter.syncing")
      : status === "completed"
        ? t("statusFooter.syncCompleted")
        : status === "failed"
          ? t("statusFooter.syncFailed")
          : t("statusFooter.sync");

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={isAdmin ? () => navigate("/app/admin/cards") : undefined}
        className={`flex items-center gap-1.5 transition-colors min-w-0 ${
          isAdmin ? "cursor-pointer hover:text-foreground" : "cursor-default"
        }`}
      >
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {countLabel}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function SorterStatusItem() {
  const { t } = useTranslation("common");
  const { t: tScanner } = useTranslation("scanner");
  const { isConnected, isReady, firmwareVersion, checkFirmwareVersion } =
    useSerial();
  const entries = useCommLog();

  const dot = !isConnected ? "muted" : !isReady ? "warning" : "success";
  const label =
    isConnected && firmwareVersion
      ? t("statusFooter.sorterWithVersion", { version: firmwareVersion })
      : t("statusFooter.sorter");
  const statusText = !isConnected
    ? t("statusFooter.sorterDisconnected")
    : !isReady
      ? t("statusFooter.sorterSelfTest")
      : firmwareVersion
        ? t("statusFooter.sorterReadyWithVersion", { version: firmwareVersion })
        : t("statusFooter.sorterReady");

  const handleCheckFirmware = async () => {
    const toastId = toast.loading(t("statusFooter.firmwareChecking"));
    const result = await checkFirmwareVersion();
    if (result.status === "ok") {
      if (isFirmwareVersionOutdated(result.version, LATEST_FIRMWARE_VERSION)) {
        toast.warning(
          t("statusFooter.firmwareOutdated", {
            version: result.version,
            latest: LATEST_FIRMWARE_VERSION,
          }),
          { id: toastId },
        );
      } else {
        toast.success(
          t("statusFooter.firmwareUpToDate", { version: result.version }),
          { id: toastId },
        );
      }
      return;
    }
    const message = {
      noVersion: t("statusFooter.firmwareNoVersion"),
      noResponse: t("statusFooter.firmwareNoResponse"),
      busy: t("statusFooter.firmwareBusy"),
      disconnected: t("statusFooter.sorterDisconnected"),
    }[result.status];
    toast.error(message, { id: toastId });
  };

  const handleCopy = async () => {
    if (entries.length === 0) {
      toast.error(tScanner("serial.commLogEmpty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(formatCommLog(entries));
      toast.success(tScanner("serial.commLogCopied"));
    } catch {
      toast.error(tScanner("serial.commLogCopyFailed"));
    }
  };

  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
        <StatusDot variant={dot} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2">
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle className="truncate">{statusText}</PopoverTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isConnected && (
              <Button variant="outline" size="sm" onClick={handleCheckFirmware}>
                {t("statusFooter.checkFirmware")}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleCopy}
              title={tScanner("serial.copyCommunication")}
            >
              <IconCopy />
              <span className="sr-only">
                {tScanner("serial.copyCommunication")}
              </span>
            </Button>
          </div>
        </div>
        <ScrollArea className="h-56 rounded-md border">
          {entries.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">
              {tScanner("serial.commLogEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 p-2 font-mono text-[10px] leading-tight">
              {entries.map((entry, i) => (
                <div key={i} className="flex gap-1.5">
                  <span
                    className={
                      entry.direction === "sent"
                        ? "text-blue-500 shrink-0"
                        : "text-green-500 shrink-0"
                    }
                  >
                    {entry.direction === "sent" ? "→" : "←"}
                  </span>
                  <span className="break-all text-muted-foreground">
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function HealthStatusItem() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data } = useHealthQuery();

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

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="flex items-center gap-3">
        <StatusItem
          label={t("statusFooter.camera")}
          dot={cameraDot}
          tooltip={cameraTooltip}
        />
        <SorterStatusItem />
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
