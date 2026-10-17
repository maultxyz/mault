import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { useTestControls } from "@/features/calibration/api/use-test-controls";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { SPACING } from "@/lib/constants/theme";

export default function CalibrationTestScreen() {
  const { t } = useTranslation();
  const sorter = useSorter();
  const test = useTestControls();
  const bins = Array.from({ length: test.binCount }, (_, i) => i + 1);
  const busy = test.activeBin !== null || test.isSampleRunning;

  return (
    <Screen
      header={<PageHeader title={t("calibration.sections.test.title")} subtitle={sorter.device?.name} onBack={() => router.back()} />}
    >
      {!test.isReady ? <Callout tone="info" title={t("calibration.testBeforeControls")} /> : null}
      {test.routeError ? <Callout tone="destructive" title={test.routeError} /> : null}

      <Surface style={{ gap: SPACING.md }}>
        <View>
          <AppText heading weight="semibold">
            {t("calibration.ir.label")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("calibration.ir.description")}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            label={t("calibration.ir.read")}
            disabled={!test.isReady || test.irMonitoring}
            onPress={() => void test.readIr()}
          />
          <Button
            style={{ flex: 1 }}
            variant={test.irMonitoring ? "primary" : "secondary"}
            label={test.irMonitoring ? t("calibration.ir.stop") : t("calibration.ir.monitor")}
            disabled={!test.isReady}
            onPress={test.toggleIrMonitor}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {test.modules.map((module) => {
            const detected = test.irStates?.[module - 1];
            return (
              <View key={module} style={{ gap: 2 }}>
                <AppText size="2xs" tone="secondary">
                  {t("calibration.moduleLabel", { module })}
                </AppText>
                <Pill
                  tone={detected ? "success" : "neutral"}
                  label={
                    detected == null
                      ? t("calibration.ir.unknown")
                      : detected
                        ? t("calibration.ir.detected")
                        : t("calibration.ir.clear")
                  }
                />
              </View>
            );
          })}
          <View style={{ gap: 2 }}>
            <AppText size="2xs" tone="secondary">
              {t("calibration.ir.hopper")}
            </AppText>
            <Pill
              tone={test.hopperHasCards ? "success" : "neutral"}
              label={
                test.hopperHasCards == null
                  ? t("calibration.ir.unknown")
                  : test.hopperHasCards
                    ? t("calibration.ir.hopperHasCards")
                    : t("calibration.ir.hopperEmpty")
              }
            />
          </View>
        </View>
      </Surface>

      <Surface style={{ gap: SPACING.md }}>
        <View>
          <AppText heading weight="semibold">
            {t("calibration.routing.label")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("calibration.routing.description")}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="refresh"
            label={t("calibration.routing.resetToNeutral")}
            disabled={!test.isReady || busy}
            onPress={() => void test.resetToNeutral()}
          />
          <Button
            style={{ flex: 1 }}
            icon="play"
            label={
              test.isSampleRunning
                ? test.activeBin != null
                  ? t("calibration.routing.binActive", { bin: test.activeBin })
                  : t("calibration.routing.running")
                : t("calibration.routing.sampleRun")
            }
            disabled={!test.isReady || busy}
            onPress={() => void test.sampleRun()}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {bins.map((bin) => (
            <Button
              key={bin}
              size="sm"
              variant={test.activeBin === bin ? "primary" : "secondary"}
              label={t("calibration.binLabel", { bin })}
              loading={test.activeBin === bin && !test.isSampleRunning}
              disabled={!test.isReady || busy}
              onPress={() => void test.testBin(bin)}
            />
          ))}
        </View>
      </Surface>
    </Screen>
  );
}
