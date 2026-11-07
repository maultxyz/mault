import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { LIVE_CORNERS_SUPPORTED } from "@/lib/constants/scanner";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { ScanOptionsSheetProps } from "@/lib/interfaces/scanner";

export function ScanOptionsSheet({
  visible,
  running,
  autoFeed,
  onAutoFeedChange,
  allowDuplicates,
  onAllowDuplicatesChange,
  handScan,
  onHandScanChange,
  removeMode,
  onRemoveModeChange,
  presetName,
  showPreset,
  cameraName,
  showCamera,
  foilTypeName,
  showFoilType,
  setName,
  conditionName,
  onChoosePreset,
  onChooseCamera,
  onChooseFoilType,
  onChooseSet,
  onChooseCondition,
  onClose,
}: ScanOptionsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const sorter = useSorter();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose}
        style={{
          maxHeight: "85%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
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
          <AppText size="lg" heading weight="bold" accessibilityRole="header" style={{ flex: 1 }}>
            {t("scan.options.title")}
          </AppText>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.lg }}>
          <ListGroup>
            <ListRow icon="filter" title={t("scan.options.set")} value={setName} onPress={onChooseSet} />
            <ListRow icon="condition" title={t("scan.options.condition")} value={conditionName} onPress={onChooseCondition} />
            {showFoilType ? (
              <ListRow icon="sparkles" title={t("scan.options.foilType")} value={foilTypeName} onPress={onChooseFoilType} />
            ) : null}
            {showCamera ? (
              <ListRow
                icon="camera"
                title={t("scan.options.camera")}
                value={cameraName ?? t("scan.options.chooseCamera")}
                disabled={running}
                onPress={onChooseCamera}
              />
            ) : null}
          </ListGroup>
          <View style={{ gap: SPACING.sm }}>
            {LIVE_CORNERS_SUPPORTED && !sorter.isConnected ? (
              <SwitchRow
                title={t("scan.options.handScan")}
                description={t("scan.options.handScanDescription")}
                value={handScan}
                onValueChange={onHandScanChange}
              />
            ) : null}
            <SwitchRow
              title={t("scan.options.removeMode")}
              description={t("scan.options.removeModeDescription")}
              value={removeMode}
              onValueChange={onRemoveModeChange}
            />
            <SwitchRow
              title={t("scan.options.allowDuplicates")}
              description={t("scan.options.allowDuplicatesDescription")}
              value={allowDuplicates}
              onValueChange={onAllowDuplicatesChange}
            />
          </View>
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("scan.controls.sorter")} />
            {sorter.isConnected ? (
              <SwitchRow
                title={t("scan.options.autoFeed")}
                description={t("scan.options.autoFeedDescription")}
                value={autoFeed}
                onValueChange={onAutoFeedChange}
              />
            ) : null}
            <ListGroup>
              {showPreset ? (
                <ListRow
                  icon="rules"
                  title={t("scan.options.preset")}
                  value={presetName ?? t("rules.choosePreset")}
                  disabled={running}
                  onPress={onChoosePreset}
                />
              ) : null}
              <ListRow
                icon="sorter"
                title={t("scan.controls.sorter")}
                subtitle={t("scan.controls.sorterDescription")}
                onPress={() => {
                  onClose();
                  router.push("/sorter");
                }}
              />
            </ListGroup>
          </View>
          <ListGroup>
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
        </ScrollView>
      </View>
    </Modal>
  );
}
