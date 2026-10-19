import { Button } from "@/components/ui/button";
import { useCollections } from "@/features/collections/api/use-collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import {
  pausePiScanSession,
  piScanHoldsPort,
  resumePiScanSession,
  stopPiScanSession,
} from "@/features/scanner/api/pi-scan-session";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { PI_CAMERA_BASE } from "@/features/scanner/lib/pi-camera";
import {
  applyPiScanState,
  getPiScanState,
  subscribePiScan,
  takePiScanAnnouncement,
} from "@/features/scanner/lib/pi-scan-store";
import { piScanStatusText } from "@/features/scanner/lib/pi-scan-status";
import { useCollectionStream } from "@/lib/app-stream";
import { PI_SCAN_CARD_EVENTS } from "@/lib/constants/scanner";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { IconPlayerPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function PiScanStatusBar() {
  const { t } = useTranslation("scanner");
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const state = useSyncExternalStore(subscribePiScan, getPiScanState);
  const { collections } = useCollections();
  const { station } = useStation();
  const { claimStationCollection } = useStations();
  const sessionLive = piScanHoldsPort(state);
  const watchGuid = sessionLive ? (state.collectionGuid ?? undefined) : undefined;
  const eventSource = useCollectionStream(watchGuid);
  const followed = useRef<string | null>(null);
  const onScanner = pathname === "/app" || pathname === "/app/";

  useEffect(() => {
    const kind = takePiScanAnnouncement(state);
    if (kind === "error") toast.error(state.message ?? "");
    else if (kind === "info" && state.message) toast.info(state.message);
  }, [state]);

  useEffect(() => {
    if (!sessionLive || !state.collectionGuid) {
      followed.current = null;
      return;
    }
    if (followed.current === state.collectionGuid) return;
    if (claimStationCollection(station.id, state.collectionGuid)) {
      followed.current = state.collectionGuid;
    }
  }, [sessionLive, state.collectionGuid, claimStationCollection, station.id]);

  useEffect(() => {
    if (!eventSource || !watchGuid) return;
    const guid = watchGuid;
    const refresh = () => {
      void invalidateCollectionCards(queryClient, guid);
    };
    const names = PI_SCAN_CARD_EVENTS.map((name) => `session:${guid}:${name}`);
    for (const name of names) eventSource.addEventListener(name, refresh);
    return () => {
      for (const name of names) eventSource.removeEventListener(name, refresh);
    };
  }, [eventSource, watchGuid, queryClient]);

  if (!sessionLive) return null;

  const collection = collections.find((item) => item.guid === state.collectionGuid);
  const status = piScanStatusText(t, state);
  const paused = state.phase === "paused";

  const onPause = () => {
    void (paused ? resumePiScanSession() : pausePiScanSession()).then((result) => {
      if (result.data) applyPiScanState(result.data);
    });
  };

  const onStop = () => {
    void stopPiScanSession().then((result) => {
      if (result.data) applyPiScanState(result.data);
    });
  };

  return (
    <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5 text-xs">
      {!onScanner && (
        <img
          src={`${PI_CAMERA_BASE}/stream`}
          alt={t("piScan.preview")}
          className="h-14 w-10 shrink-0 rounded-md bg-muted object-cover"
        />
      )}
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          paused ? "bg-warning" : "bg-success",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {collection ? `${collection.name} · ${status}` : status}
        </p>
        <p className="text-2xs text-foreground/70">
          {t("piScan.count", { count: state.cardsScanned })}
        </p>
      </div>
      {!onScanner && (
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/app" />}>
          {t("piScan.openScanner")}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onPause} disabled={state.stopping}>
        {paused ? <IconPlayerPlay /> : <IconPlayerPause />}
        {paused ? t("piScan.resume") : t("piScan.pause")}
      </Button>
      <Button variant="outline" size="sm" onClick={onStop} disabled={state.stopping}>
        <IconPlayerStop />
        {t("piScan.stop")}
      </Button>
    </div>
  );
}
