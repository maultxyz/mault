import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  acquireStream,
  stopMediaStream,
} from "@/features/scanner/lib/camera-stream";
import { useScanCards } from "@/features/storage/api/use-scan-cards";
import { SCAN_CARDS_RESULT_VARIANTS } from "@/lib/constants/storage";
import type {
  ScanCardsPanelProps,
  ScanCardsResult,
} from "@/lib/interfaces/storage";
import { IconCamera, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function ScanCardsPanel({ source, mode }: ScanCardsPanelProps) {
  const { t } = useTranslation("storage");
  const { canScan, isScanning, result, scanVideoFrame } = useScanCards(source);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    acquireStream(undefined, true)
      .then((next) => {
        if (cancelled) {
          stopMediaStream(next);
          return;
        }
        acquired = next;
        setStream(next);
      })
      .catch(() => {
        if (!cancelled) setCameraFailed(true);
      });
    return () => {
      cancelled = true;
      stopMediaStream(acquired);
      releaseCanvases([canvasRef.current]);
      canvasRef.current = null;
    };
  }, []);

  const attachVideo = (video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => {});
    }
  };

  const scan = () => {
    const video = videoRef.current;
    if (!video) return;
    canvasRef.current ??= document.createElement("canvas");
    void scanVideoFrame(video, canvasRef.current);
  };

  const resultTitle = (current: ScanCardsResult) => {
    const name = current.cardName ?? "";
    switch (current.kind) {
      case "checked":
        return mode === "verify"
          ? t("verify.scan.verified", {
              name,
              position: current.position ?? 0,
            })
          : t("pickList.scan.picked", {
              name,
              location: current.locationName ?? "",
              position: current.position ?? 0,
            });
      case "already-checked":
        return mode === "verify"
          ? t("verify.scan.alreadyVerified", { name })
          : t("pickList.scan.alreadyPicked", { name });
      case "not-listed":
        return mode === "verify"
          ? t("verify.scan.notInLocation", { name })
          : t("pickList.scan.notOnList", { name });
      case "no-match":
        return t("pickList.scan.noMatch");
      case "failed":
        return t("pickList.scan.failed");
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-background p-3 ring-1 ring-border animate-in fade-in motion-reduce:animate-none">
      {cameraFailed ? (
        <Callout variant="error">{t("pickList.scan.cameraFailed")}</Callout>
      ) : (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black md:aspect-[3/4]">
          <video
            ref={attachVideo}
            autoPlay
            muted
            playsInline
            className="size-full object-cover"
          />
          {!stream && (
            <IconLoader2 className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          )}
        </div>
      )}
      <Button
        className="w-full"
        disabled={!stream || !canScan || isScanning}
        onClick={scan}
      >
        {isScanning ? <IconLoader2 className="animate-spin" /> : <IconCamera />}
        {t("pickList.scan.scanCard")}
      </Button>
      <div role="status">
        {result ? (
          <Callout
            key={result.resultId}
            variant={SCAN_CARDS_RESULT_VARIANTS[result.kind]}
            className="animate-in fade-in motion-reduce:animate-none"
          >
            {resultTitle(result)}
          </Callout>
        ) : (
          <p className="text-xs text-foreground/70">
            {mode === "verify" ? t("verify.scan.hint") : t("pickList.scan.hint")}
          </p>
        )}
      </div>
    </section>
  );
}
