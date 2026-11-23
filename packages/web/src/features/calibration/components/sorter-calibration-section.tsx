import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SORTER_MODEL_LEGEND } from "@/lib/constants/sorter-model";
import { Switch } from "@/components/ui/switch";
import { SorterCalibrationPanel } from "@/features/calibration/components/sorter-calibration-panel";
import { sorterHotspots } from "@/features/calibration/lib/sorter-hotspots";
import type { SorterCalibrationSectionProps } from "@/lib/interfaces/sorter-model";
import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const SorterModelViewer = lazy(
  () => import("@/features/calibration/components/sorter-model-viewer"),
);

export function SorterCalibrationSection({
  state,
  enabled,
  onEnabledChange,
  actions,
}: SorterCalibrationSectionProps) {
  const { t } = useTranslation("calibration");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const hotspots = useMemo(
    () => sorterHotspots(state.modules),
    [state.modules],
  );
  const selected = enabled
    ? (hotspots.find((hotspot) => hotspot.key === selectedKey) ?? null)
    : null;

  return (
    <SettingsSection
      heading={t("sorterModel.heading")}
      description={
        enabled
          ? t("sorterModel.description")
          : t("sorterModel.betaDescription")
      }
      badge={<Badge variant="outline">{t("experimentalFeatures.badge")}</Badge>}
      action={
        <>
          {enabled && actions}
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label={t("sorterModel.betaToggle")}
          />
        </>
      }
      className={enabled ? "min-h-0 flex-1" : undefined}
    >
      {enabled && (
        <Suspense
          fallback={
            <div role="status" aria-busy="true" className="flex min-h-0 flex-1 flex-col gap-2">
              <span className="sr-only">{t("a11y.loading", { ns: "common" })}</span>
              <Skeleton className="min-h-64 flex-1 rounded-lg" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {SORTER_MODEL_LEGEND.map((part) => (
                  <div key={part} className="flex h-4 items-center gap-1.5">
                    <Skeleton className="size-3 shrink-0 rounded-sm" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-7 shrink-0 rounded-full max-md:h-6 max-md:w-10" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          }
        >
          <SorterModelViewer
            modules={state.modules}
            configs={state.configs}
            pendingCalibration={state.pendingCalibration}
            active={state.active}
            sliderValues={state.sliderValues}
            testingServos={state.testingServos}
            pushTestingModule={state.pushTestingModule}
            selectedHotspot={selected?.key ?? null}
            onSelectHotspot={(hotspot) => setSelectedKey(hotspot.key)}
          >
            {selected && (
              <SorterCalibrationPanel
                hotspot={selected}
                state={state}
                onClose={() => setSelectedKey(null)}
              />
            )}
          </SorterModelViewer>
        </Suspense>
      )}
    </SettingsSection>
  );
}
