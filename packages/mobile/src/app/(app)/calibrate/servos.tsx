import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { SaveBar } from "@/components/ui/save-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalibration } from "@/features/calibration/api/use-calibration";
import { FeederPanel } from "@/features/calibration/components/feeder-panel";
import { ModuleCard } from "@/features/calibration/components/module-card";
import { useRetractCard } from "@/features/sorter/api/use-retract-card";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { PHASE_TONES } from "@/lib/constants/sorter";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function CalibrateScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const sorter = useSorter();
  const state = useCalibration();
  const retract = useRetractCard();

  usePreventRemove(state.isDirty && !state.isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("calibration.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          state.discard();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("calibration.title")}
        subtitle={sorter.device?.name ?? t("calibration.subtitle")}
        onBack={() => router.back()}
        actions={<Pill tone={PHASE_TONES[sorter.phase]} label={t(`sorter.phase.${sorter.phase}`)} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg }}>
        {!sorter.isConnected ? (
          <Callout
            tone="warning"
            title={t("calibration.notConnectedTitle")}
            description={t("calibration.notConnectedDescription")}
            action={<Button size="sm" variant="secondary" label={t("scan.openSorter")} onPress={() => router.push("/sorter")} />}
          />
        ) : null}
        {state.saveError ? <Callout tone="destructive" title={t("calibration.saveFailed")} /> : null}

        <View style={{ gap: SPACING.sm }}>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              icon="selfTest"
              label={state.isTesting ? t("calibration.testing") : t("calibration.runTest")}
              loading={state.isTesting}
              disabled={!sorter.isConnected || state.isUnconfigured}
              onPress={() => void state.handleTest()}
            />
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              label={t("calibration.feed")}
              disabled={!state.isReady}
              onPress={() => void state.handleFeed()}
            />
          </View>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              icon="arrowDown"
              label={t("calibration.dropCard")}
              disabled={!state.isReady}
              onPress={state.handleDropCard}
            />
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              icon="arrowUp"
              label={t("calibration.retractCard")}
              loading={retract.isRetracting}
              disabled={!state.isReady || retract.retractLockedReason !== null}
              onPress={() => void retract.retractCard(state.applyDraftsToDevice)}
            />
          </View>
          {retract.retractLockedReason ? (
            <AppText size="xs" tone="secondary">
              {retract.retractLockedReason}
            </AppText>
          ) : null}
          {state.isUnconfigured ? (
            <AppText size="xs" tone="secondary">
              {t("calibration.calibrateBeforeTest")}
            </AppText>
          ) : sorter.isConnected && !state.isReady ? (
            <AppText size="xs" tone="secondary">
              {t("calibration.testBeforeControls")}
            </AppText>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText size="xs" tone="secondary">
            {t("calibration.modules")}
          </AppText>
          <Button
            size="sm"
            variant="ghost"
            icon="refresh"
            label={t("calibration.resetServosToDefaults")}
            disabled={!state.canCalibrate}
            onPress={state.handleResetServosToDefaults}
          />
        </View>
        {state.isLoading && sorter.isConnected ? (
          <View style={{ gap: SPACING.md }}>
            <Skeleton height={320} />
            <Skeleton height={320} />
          </View>
        ) : (
          state.modules.map((module) => (
            <ModuleCard key={module} module={module} state={state} firmwareVersion={sorter.firmwareVersion} />
          ))
        )}

        <FeederPanel state={state} firmwareVersion={sorter.firmwareVersion} />
      </ScrollView>
      <SaveBar
        visible={state.isDirty}
        saving={state.isSaving}
        onSave={() => void state.save()}
        onDiscard={state.discard}
      />
    </View>
  );
}
