import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCollections } from "@/features/collections/api/use-collections";
import { useRaspberryPiCamera } from "@/features/raspberry-pis/api/use-raspberry-pi-camera";
import { useRaspberryPiScan } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { RaspberryPiStartDialog } from "@/features/raspberry-pis/components/raspberry-pi-start-dialog";
import { formatShortDate } from "@/lib/format";
import { RASPBERRY_PI_STATUS_BADGE_VARIANTS } from "@/lib/constants/raspberry-pis";
import type { RaspberryPiRowProps } from "@/lib/interfaces/raspberry-pis";
import { piHostScanControls } from "@magic-vault/shared";
import {
  IconCamera,
  IconCpu,
  IconHandStop,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerTrackNext,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function RaspberryPiRow({ host, canManage, onRemove, onRename }: RaspberryPiRowProps) {
  const { t } = useTranslation("settings");
  const { collections } = useCollections();
  const scan = useRaspberryPiScan(host.guid);
  const controls = piHostScanControls(host);
  const scanState = host.scanState;
  const [isStarting, setIsStarting] = useState(false);
  const [isWatchingCamera, setIsWatchingCamera] = useState(false);
  const camera = useRaspberryPiCamera(host.guid, isWatchingCamera && host.connected);
  const autoFeedId = `raspberry-pi-auto-feed-${host.guid}`;
  const isBusy = scan.isPending;
  const isActive = controls.canPause || controls.canResume;
  const collectionName = (guid: string | null | undefined) =>
    collections.find((collection) => collection.guid === guid)?.name ?? "";
  const showsProgress =
    !!scanState && controls.statusKey !== "offline" && controls.statusKey !== "idle";

  return (
    <div className="flex flex-col gap-3 px-3 py-2.5 text-sm md:gap-2">
      <div className="flex items-center gap-3">
        <IconCpu className="size-4 shrink-0 text-foreground/70" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-medium">{host.name}</p>
          <p className="truncate text-xs text-foreground/70">
            {t("raspberryPis.linkedOn", { date: formatShortDate(host.pairedAt) })}
            {host.lastSeenAt &&
              ` · ${t("raspberryPis.lastSeen", { date: formatShortDate(host.lastSeenAt) })}`}
          </p>
        </div>
        <span role="status">
          <Badge variant={RASPBERRY_PI_STATUS_BADGE_VARIANTS[controls.statusKey]}>
            {t(`raspberryPis.status.${controls.statusKey}`)}
          </Badge>
        </span>
      </div>

      {controls.statusKey === "offline" && (
        <p className="text-xs text-foreground/70">{t("raspberryPis.offlineHint")}</p>
      )}

      {showsProgress && (
        <div className="flex flex-col gap-0.5 text-xs text-foreground/70">
          <p className="tabular-nums">
            {t("raspberryPis.progress", {
              count: scanState.cardsScanned,
              collection: collectionName(scanState.collectionGuid),
            })}
          </p>
          {scanState.lastCard?.name && (
            <p className="truncate">
              {t("raspberryPis.lastCard", { name: scanState.lastCard.name })}
            </p>
          )}
          {scanState.message && <p>{scanState.message}</p>}
        </div>
      )}

      {isWatchingCamera && host.connected && (
        <div className="overflow-hidden rounded-lg bg-muted">
          {camera.isUnavailable ? (
            <p className="p-3 text-xs text-foreground/70" role="alert">
              {t("raspberryPis.cameraUnavailable")}
            </p>
          ) : camera.frame ? (
            <img
              src={camera.frame}
              alt={t("raspberryPis.cameraAlt", { name: host.name })}
              className="aspect-video w-full object-contain"
            />
          ) : (
            <>
              <Skeleton className="aspect-video w-full" />
              <p className="sr-only" role="status">
                {t("raspberryPis.cameraWaiting")}
              </p>
            </>
          )}
        </div>
      )}

      {isActive && scanState && (
        <Field orientation="horizontal" className="max-w-sm">
          <FieldLabel htmlFor={autoFeedId}>{t("raspberryPis.autoFeedLabel")}</FieldLabel>
          <Switch
            id={autoFeedId}
            checked={scanState.autoFeed}
            disabled={isBusy}
            onCheckedChange={(autoFeed) => scan.mutate({ kind: "settings", body: { autoFeed } })}
          />
        </Field>
      )}

      <div className="flex flex-wrap gap-1.5">
        {controls.canStart && (
          <Button type="button" onClick={() => setIsStarting(true)}>
            <IconPlayerPlay />
            {t("raspberryPis.start")}
          </Button>
        )}
        {controls.canPause && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => scan.mutate({ kind: "action", action: "pause" })}
          >
            <IconPlayerPause />
            {t("raspberryPis.pause")}
          </Button>
        )}
        {controls.canResume && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => scan.mutate({ kind: "action", action: "resume" })}
          >
            <IconPlayerPlay />
            {t("raspberryPis.resume")}
          </Button>
        )}
        {controls.canPause && scanState && !scanState.autoFeed && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => scan.mutate({ kind: "action", action: "feed" })}
          >
            <IconPlayerTrackNext />
            {t("raspberryPis.feed")}
          </Button>
        )}
        {controls.canStop && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => scan.mutate({ kind: "stop" })}
          >
            <IconPlayerStop />
            {t("raspberryPis.stop")}
          </Button>
        )}
        {controls.canEmergencyStop && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => scan.mutate({ kind: "action", action: "emergency-stop" })}
          >
            <IconHandStop />
            {t("raspberryPis.emergencyStop")}
          </Button>
        )}
        {host.connected && (
          <Button
            type="button"
            variant={isWatchingCamera ? "selected" : "outline"}
            aria-pressed={isWatchingCamera}
            onClick={() => setIsWatchingCamera((watching) => !watching)}
          >
            <IconCamera />
            {t("raspberryPis.camera")}
          </Button>
        )}
        {canManage && (
          <>
            <Button type="button" variant="ghost" onClick={() => onRename(host)}>
              {t("raspberryPis.rename")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onRemove(host)}>
              {t("raspberryPis.remove")}
            </Button>
          </>
        )}
      </div>

      <RaspberryPiStartDialog host={host} open={isStarting} onOpenChange={setIsStarting} />
    </div>
  );
}
