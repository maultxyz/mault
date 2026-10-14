import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSorterFocus } from "@/features/calibration/api/use-sorter-focus";
import { SorterHotspotButton } from "@/features/calibration/components/sorter-hotspot-button";
import { SorterModelLegend } from "@/features/calibration/components/sorter-model-legend";
import { sorterHotspots } from "@/features/calibration/lib/sorter-hotspots";
import { sorterServoTargets } from "@/lib/sorter-model/sorter-rig";
import { SorterScene } from "@/lib/sorter-model/sorter-scene";
import {
  SORTER_FEEDER_HOTSPOT_POINT,
  SORTER_HOTSPOT_POINTS,
} from "@/lib/constants/sorter-model";
import type {
  SorterHotspot,
  SorterHotspotAnchor,
  SorterModelStatus,
  SorterModelViewerProps,
} from "@/lib/interfaces/sorter-model";
import {
  IconAlertTriangle,
  IconEye,
  IconFocusCentered,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function SorterModelViewer({
  modules,
  configs,
  pendingCalibration,
  active,
  sliderValues,
  testingServos,
  pushTestingModule,
  selectedHotspot,
  onSelectHotspot,
  children,
}: SorterModelViewerProps) {
  const { t } = useTranslation("calibration");
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SorterScene | null>(null);
  const [status, setStatus] = useState<SorterModelStatus>("loading");
  const [showCover, setShowCover] = useState(false);
  const [xray, setXray] = useState(false);

  const targets = useMemo(
    () =>
      sorterServoTargets({
        modules,
        configs,
        pendingCalibration,
        active,
        sliderValues,
        testingServos,
        pushTestingModule,
      }),
    [
      modules,
      configs,
      pendingCalibration,
      active,
      sliderValues,
      testingServos,
      pushTestingModule,
    ],
  );
  const [focus, setFocus] = useSorterFocus(targets);
  const hotspots = useMemo(() => sorterHotspots(modules), [modules]);
  const anchorsRef = useRef(new Map<string, SorterHotspotAnchor>());

  const registerHotspot = useCallback(
    (hotspot: SorterHotspot, element: HTMLElement | null) => {
      if (element) {
        anchorsRef.current.set(hotspot.key, {
          element,
          point:
            hotspot.kind === "feeder"
              ? SORTER_FEEDER_HOTSPOT_POINT
              : SORTER_HOTSPOT_POINTS[hotspot.servo],
          module: hotspot.kind === "feeder" ? null : hotspot.module,
        });
      } else {
        anchorsRef.current.delete(hotspot.key);
      }
      sceneRef.current?.setHotspots(anchorsRef.current);
    },
    [],
  );
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const moduleCountRef = useRef(modules.length);
  moduleCountRef.current = modules.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new SorterScene({
      container,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      onLoad: () => setStatus("ready"),
      onError: () => setStatus("error"),
    });
    scene.setTargets(targetsRef.current);
    scene.setModuleCount(moduleCountRef.current);
    scene.setHotspots(anchorsRef.current);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setTargets(targets);
  }, [targets]);

  useEffect(() => {
    sceneRef.current?.setModuleCount(modules.length);
  }, [modules.length, status]);

  useEffect(() => {
    sceneRef.current?.setFocus(focus);
  }, [focus, status]);

  useEffect(() => {
    const hotspot = hotspots.find((entry) => entry.key === selectedHotspot);
    if (hotspot?.kind === "servo") {
      setFocus({ module: hotspot.module, servo: hotspot.servo });
    }
  }, [selectedHotspot, hotspots, setFocus]);

  useEffect(() => {
    sceneRef.current?.setCoverVisible(showCover);
  }, [showCover, status]);

  useEffect(() => {
    sceneRef.current?.setXray(xray);
  }, [xray, status]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative flex min-h-64 flex-1 overflow-hidden rounded-lg border bg-muted/40">
        <div className="relative min-w-0 flex-1">
          <div
            ref={containerRef}
            role="img"
            aria-label={t("sorterModel.label")}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden [&>button]:pointer-events-auto">
            {status === "ready" &&
              hotspots.map((hotspot) => (
                <SorterHotspotButton
                  key={hotspot.key}
                  hotspot={hotspot}
                  selected={hotspot.key === selectedHotspot}
                  onSelect={onSelectHotspot}
                  register={registerHotspot}
                />
              ))}
          </div>
          {status === "loading" && (
            <Skeleton className="absolute inset-0 rounded-none" />
          )}
          {status === "error" && (
            <div className="absolute inset-0 grid place-items-center p-4">
              <Callout variant="error" icon={IconAlertTriangle}>
                {t("sorterModel.loadFailed")}
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
                {t("sorterModel.xray")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sceneRef.current?.resetView()}
                className="bg-background/80"
              >
                <IconFocusCentered />
                {t("sorterModel.resetView")}
              </Button>
            </div>
          )}
        </div>
        {children}
      </div>
      <SorterModelLegend focus={focus} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-foreground/70">{t("sorterModel.hint")}</p>
        <div className="flex items-center gap-2">
          <Switch
            id="sorter-model-cover"
            checked={showCover}
            onCheckedChange={setShowCover}
          />
          <Label htmlFor="sorter-model-cover">
            {t("sorterModel.showCover")}
          </Label>
        </div>
      </div>
    </div>
  );
}
