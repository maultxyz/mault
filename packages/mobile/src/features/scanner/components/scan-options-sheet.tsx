import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import { Sheet } from "@/components/ui/sheet";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { SPACING } from "@/lib/constants/theme";
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
  const sorter = useSorter();

  return (
    <Sheet visible={visible} onClose={onClose} title={t("scan.options.title")} contentContainerStyle={{ gap: SPACING.lg }}>
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
        {!sorter.isConnected ? (
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
    </Sheet>
  );
}
