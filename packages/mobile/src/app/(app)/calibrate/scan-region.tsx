import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";
import { useCameraPermission } from "react-native-vision-camera";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { SliderField } from "@/components/ui/slider-field";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { useScanSettingsDraft } from "@/features/calibration/api/use-scan-settings-draft";
import { ScanRegionEditor } from "@/features/calibration/components/scan-region-editor";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import {
  CAPTURE_SETTLE_DELAY_SLIDER_MAX,
  MATCHES_NEEDED_MIN,
  MATCHES_NEEDED_SLIDER_MAX,
  SCAN_REGION_COVERAGE_MIN,
  SCAN_REGION_OFFSET_LIMIT,
  sliderMax,
} from "@/lib/constants/calibration";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function CalibrationScanRegionScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const sorter = useSorter();
  const permission = useCameraPermission();
  const draft = useScanSettingsDraft();
  const pct = (value: number) => Math.round(value * 100);
  const percentLabel = (value: number) => t("calibration.scanRegion.percent", { value: pct(value) });

  usePreventRemove(draft.isDirty && !draft.isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("calibration.sections.scanRegion.title")} subtitle={sorter.device?.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        {draft.saveError ? <Callout tone="destructive" title={t("calibration.saveFailed")} /> : null}

        <Surface style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold">
              {t("calibration.scanRegion.heading")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("calibration.scanRegion.instructions")}
            </AppText>
          </View>
          {permission.hasPermission ? (
            <ScanRegionEditor region={draft.region} onChange={draft.setRegion} />
          ) : (
            <Button
              variant="secondary"
              icon="camera"
              label={t("scan.allowCamera")}
              disabled={!permission.canRequestPermission}
              onPress={() => void permission.requestPermission()}
            />
          )}
          <AppText size="xs" tone="secondary">
            {t("calibration.scanRegion.liveDetectionHint")}
          </AppText>
          <SliderField
            label={t("calibration.scanRegion.size")}
            valueLabel={percentLabel(draft.region.coverage)}
            accessibilityLabel={t("calibration.scanRegion.size")}
            min={pct(SCAN_REGION_COVERAGE_MIN)}
            max={100}
            value={pct(draft.region.coverage)}
            onValueChange={(value) => draft.setRegion({ ...draft.region, coverage: value / 100 })}
          />
          <SliderField
            label={t("calibration.scanRegion.offsetX")}
            valueLabel={percentLabel(draft.region.offsetX)}
            accessibilityLabel={t("calibration.scanRegion.offsetX")}
            min={-pct(SCAN_REGION_OFFSET_LIMIT)}
            max={pct(SCAN_REGION_OFFSET_LIMIT)}
            value={pct(draft.region.offsetX)}
            onValueChange={(value) => draft.setRegion({ ...draft.region, offsetX: value / 100 })}
          />
          <SliderField
            label={t("calibration.scanRegion.offsetY")}
            valueLabel={percentLabel(draft.region.offsetY)}
            accessibilityLabel={t("calibration.scanRegion.offsetY")}
            min={-pct(SCAN_REGION_OFFSET_LIMIT)}
            max={pct(SCAN_REGION_OFFSET_LIMIT)}
            value={pct(draft.region.offsetY)}
            onValueChange={(value) => draft.setRegion({ ...draft.region, offsetY: value / 100 })}
          />
          <Button size="sm" variant="ghost" icon="refresh" label={t("calibration.scanRegion.resetToDefault")} onPress={draft.resetRegion} />
        </Surface>

        <Surface style={{ gap: SPACING.xl }}>
          <SliderField
            label={t("calibration.scanRegion.captureSettleLabel")}
            description={t("calibration.scanRegion.captureSettleDescription")}
            valueLabel={t("calibration.msValue", { value: draft.captureSettleDelayMs })}
            accessibilityLabel={t("calibration.scanRegion.captureSettleLabel")}
            min={0}
            max={sliderMax(draft.captureSettleDelayMs, CAPTURE_SETTLE_DELAY_SLIDER_MAX)}
            step={10}
            value={draft.captureSettleDelayMs}
            onValueChange={draft.setCaptureSettleDelayMs}
          />
          <SliderField
            label={t("calibration.scanRegion.matchesNeededLabel")}
            description={t("calibration.scanRegion.matchesNeededDescription")}
            valueLabel={String(draft.matchesNeeded)}
            accessibilityLabel={t("calibration.scanRegion.matchesNeededLabel")}
            min={MATCHES_NEEDED_MIN}
            max={sliderMax(draft.matchesNeeded, MATCHES_NEEDED_SLIDER_MAX)}
            value={draft.matchesNeeded}
            onValueChange={draft.setMatchesNeeded}
          />
          <SwitchRow
            title={t("calibration.scanRegion.checkBothOrientationsLabel")}
            description={t("calibration.scanRegion.checkBothOrientationsDescription")}
            value={draft.checkBothOrientations}
            onValueChange={draft.setCheckBothOrientations}
          />
        </Surface>
      </ScrollView>
      <SaveBar visible={draft.isDirty} saving={draft.isSaving} onSave={() => void draft.save()} onDiscard={draft.discard} />
    </View>
  );
}
