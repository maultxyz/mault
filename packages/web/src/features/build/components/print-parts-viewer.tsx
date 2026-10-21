import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintPartsKey } from "@/features/build/components/print-parts-key";
import { printPartImagesStore } from "@/features/build/lib/print-part-images-store";
import {
  PRINT_PART_IMAGE_PARTS,
  PRINT_PART_IMAGE_SIZE,
} from "@/lib/constants/build";
import type { PrintPartsViewerProps } from "@/lib/interfaces/build";
import type {
  SorterModelStatus,
  SorterPrintPart,
} from "@/lib/interfaces/sorter-model";
import { SorterScene } from "@/lib/sorter-model/sorter-scene";
import {
  IconAlertTriangle,
  IconEye,
  IconFocusCentered,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function PrintPartsViewer({
  moduleCount,
  breakoutHeight,
  entries,
}: PrintPartsViewerProps) {
  const { t } = useTranslation("build");
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SorterScene | null>(null);
  const [status, setStatus] = useState<SorterModelStatus>("loading");
  const [selected, setSelected] = useState<SorterPrintPart | null>(null);
  const [preview, setPreview] = useState<SorterPrintPart | null>(null);
  const [xray, setXray] = useState(false);
  const setupRef = useRef({ moduleCount, breakoutHeight });
  setupRef.current = { moduleCount, breakoutHeight };

  const listed = (part: SorterPrintPart | null) =>
    part !== null && entries.some((entry) => entry.part === part) ? part : null;
  const activeSelection = listed(selected);
  const isolated = listed(preview) ?? activeSelection;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new SorterScene({
      container,
      palette: "print",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      onLoad: () => setStatus("ready"),
      onError: () => {
        setStatus("error");
        printPartImagesStore.setError();
      },
    });
    scene.setModuleCount(setupRef.current.moduleCount);
    scene.setBreakoutHeight(setupRef.current.breakoutHeight);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setModuleCount(moduleCount);
  }, [moduleCount]);

  useEffect(() => {
    sceneRef.current?.setBreakoutHeight(breakoutHeight);
  }, [breakoutHeight]);

  useEffect(() => {
    sceneRef.current?.setCoverVisible(true);
  }, [status]);

  useEffect(() => {
    sceneRef.current?.setIsolatedPart(isolated);
  }, [isolated, status]);

  useEffect(() => {
    sceneRef.current?.setXray(xray);
  }, [xray, status]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== "ready" || !scene) return;
    printPartImagesStore.setImages(
      scene.capturePartImages(PRINT_PART_IMAGE_PARTS, PRINT_PART_IMAGE_SIZE),
    );
  }, [status, moduleCount, breakoutHeight]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-80 overflow-hidden rounded-lg border bg-muted/40 sm:h-[28rem]">
        <div
          ref={containerRef}
          role="img"
          aria-label={t("printModel.label", { count: moduleCount })}
          className="size-full cursor-grab active:cursor-grabbing"
        />
        {status === "loading" && (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-4">
            <Callout variant="error" icon={IconAlertTriangle}>
              {t("printModel.loadFailed")}
            </Callout>
          </div>
        )}
        {status === "ready" && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              variant={xray ? "default" : "outline"}
              size="sm"
              aria-pressed={xray}
              onClick={() => setXray((value) => !value)}
              className={xray ? undefined : "bg-background/80"}
            >
              <IconEye />
              {t("printModel.xray")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sceneRef.current?.resetView()}
              className="bg-background/80"
            >
              <IconFocusCentered />
              {t("printModel.resetView")}
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-foreground/70">{t("printModel.hint")}</p>
      <PrintPartsKey
        entries={entries}
        breakoutHeight={breakoutHeight}
        selected={activeSelection}
        onSelect={setSelected}
        onPreview={setPreview}
      />
    </div>
  );
}
