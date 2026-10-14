import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
      className={enabled ? "min-h-[32rem] flex-1" : undefined}
    >
      {enabled && (
        <Suspense fallback={<Skeleton className="min-h-0 flex-1 rounded-lg" />}>
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
