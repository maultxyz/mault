import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { useRetractCard } from "@/features/sorter/api/use-retract-card";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { ScannerControlAction, ScannerControlsSheetProps } from "@/lib/interfaces/scanner";

export function ScannerControlsSheet({
  visible,
  running,
  canScan,
  onScanNow,
  onFeedOne,
  autoFeed,
  onClose,
}: ScannerControlsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const sorter = useSorter();
  const retract = useRetractCard();
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
    <Sheet visible={visible} onClose={onClose} title={t("scan.controls.title")} contentContainerStyle={{ gap: SPACING.md }}>
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
          icon="arrowUp"
          title={t("scan.controls.retract")}
          subtitle={retract.retractLockedReason ?? t("scan.controls.retractDescription")}
          disabled={sorterActionsDisabled || retract.retractLockedReason !== null}
          right={spinner("retract")}
          onPress={() => void run("retract", () => retract.retractCard())}
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
      </ListGroup>
    </Sheet>
  );
}
