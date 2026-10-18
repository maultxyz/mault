import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { LIVE_CORNERS_SUPPORTED } from "@/lib/constants/scanner";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ScannerControlAction, ScannerControlsSheetProps } from "@/lib/interfaces/scanner";

export function ScannerControlsSheet({
  visible,
  running,
  canScan,
  onScanNow,
  onFeedOne,
  autoFeed,
  onAutoFeedChange,
  allowDuplicates,
  onAllowDuplicatesChange,
  handScan,
  onHandScanChange,
  cameras,
  selectedCameraId,
  onSelectCamera,
  onClose,
}: ScannerControlsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const sorter = useSorter();
  const [busy, setBusy] = useState<ScannerControlAction | null>(null);
  const [failed, setFailed] = useState(false);
  const sorterActionsDisabled = running || !sorter.isReady || busy !== null;
  const feedDisabled = (running && autoFeed) || !sorter.isReady || busy !== null;

  const run = async (action: ScannerControlAction, task: () => Promise<unknown>, closeAfter = false) => {
    setBusy(action);
    setFailed(false);
    try {
      await task();
      if (closeAfter) onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const spinner = (action: ScannerControlAction) =>
    busy === action ? <ActivityIndicator size="small" color={colors.foregroundSecondary} /> : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.sm,
            paddingHorizontal: SCREEN_GUTTER,
            paddingVertical: SPACING.md,
          }}
        >
          <AppText size="lg" heading weight="bold" style={{ flex: 1 }}>
            {t("scan.controls.title")}
          </AppText>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView style={{ maxHeight: "80%" }} contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md }}>
          {running ? <Callout tone="info" title={t("scan.controls.pausedHint")} /> : null}
          {failed ? <Callout tone="destructive" title={t("scan.controls.failed")} /> : null}
          <ListGroup>
            <ListRow
              icon="scan"
              title={t("scan.controls.scanNow")}
              subtitle={t("scan.controls.scanNowDescription")}
              disabled={running || !canScan || busy !== null}
              right={spinner("scan")}
              onPress={() => {
                onScanNow();
                onClose();
              }}
            />
            <ListRow
              icon="play"
              title={t("scan.controls.feed")}
              subtitle={t("scan.controls.feedDescription")}
              disabled={feedDisabled || !canScan}
              right={spinner("feed")}
              onPress={() => void run("feed", onFeedOne, true)}
            />
            <ListRow
              icon="arrowDown"
              title={t("scan.controls.drop")}
              subtitle={t("scan.controls.dropDescription")}
              disabled={sorterActionsDisabled}
              right={spinner("drop")}
              onPress={() => void run("drop", sorter.clearDevice)}
            />
            <ListRow
              icon="refresh"
              title={t("scan.controls.neutral")}
              subtitle={t("scan.controls.neutralDescription")}
              disabled={sorterActionsDisabled}
              right={spinner("neutral")}
              onPress={() =>
                void run("neutral", async () => {
                  if (!(await sorter.sendNeutral())) throw new Error("neutral");
                })
              }
            />
          </ListGroup>
          <ListGroup>
            <ListRow
              icon="sorter"
              title={t("scan.controls.sorter")}
              subtitle={t("scan.controls.sorterDescription")}
              onPress={() => {
                onClose();
                router.push("/sorter");
              }}
            />
            <ListRow
              icon="desktop"
              title={t("scan.options.pairDesktop")}
              subtitle={t("scan.options.pairDesktopDescription")}
              disabled={running}
              onPress={() => {
                onClose();
                router.push("/pair-camera");
              }}
            />
          </ListGroup>
          <SectionHeader title={t("scan.options.title")} />
          {LIVE_CORNERS_SUPPORTED && !sorter.isReady ? (
            <SwitchRow
              title={t("scan.options.handScan")}
              description={t("scan.options.handScanDescription")}
              value={handScan}
              onValueChange={onHandScanChange}
            />
          ) : null}
          <SwitchRow
            title={t("scan.options.autoFeed")}
            description={t("scan.options.autoFeedDescription")}
            value={autoFeed}
            onValueChange={onAutoFeedChange}
          />
          <SwitchRow
            title={t("scan.options.allowDuplicates")}
            description={t("scan.options.allowDuplicatesDescription")}
            value={allowDuplicates}
            onValueChange={onAllowDuplicatesChange}
          />
          {cameras.length > 1 ? (
            <>
              <SectionHeader title={t("scan.options.camera")} />
              <ListGroup>
                {cameras.map((camera, index) => (
                  <ListRow
                    key={camera.id}
                    icon="camera"
                    title={camera.localizedName || t("scan.options.cameraFallback", { number: index + 1 })}
                    subtitle={t(`scan.options.cameraPosition.${camera.position}`, { defaultValue: camera.position })}
                    selected={camera.id === selectedCameraId}
                    disabled={running}
                    onPress={() => onSelectCamera(camera.id)}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
