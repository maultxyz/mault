import { Callout } from "@/components/callout";
import { MobileListRow } from "@/components/mobile-list-row";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MOBILE_LIST_CLASS, MOBILE_SORTER_PATH } from "@/lib/constants/nav";
import { SESSION_TIMER_RUNNING_STATUSES } from "@/lib/constants/scanner";
import type { MobileScanControlsSheetProps } from "@/lib/interfaces/scanner";
import {
  IconArrowDown,
  IconCpu,
  IconLoader2,
  IconPlayerPlay,
  IconRefresh,
  IconScan,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileScanControlsSheet({
  open,
  onOpenChange,
  chrome,
}: MobileScanControlsSheetProps) {
  const { t } = useTranslation("scanner");
  const running = SESSION_TIMER_RUNNING_STATUSES.includes(chrome.status);
  const busy =
    chrome.isFeeding || chrome.isClearingDevice || chrome.isResettingDevice;
  const sorterDisabled = running || !chrome.isReady || busy;
  const close = () => onOpenChange(false);
  const spinner = <IconLoader2 className="animate-spin" />;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex flex-col gap-4 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-lg font-bold text-foreground">
            {t("mobileScan.controls.title")}
          </DrawerTitle>
          {running && (
            <Callout variant="info">{t("mobileScan.controls.pausedHint")}</Callout>
          )}
          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconScan />}
              label={t("mobileScan.controls.scanNow")}
              description={t("mobileScan.controls.scanNowDescription")}
              disabled={running || !chrome.isCameraActive || busy}
              onClick={() => {
                chrome.onScanOnce();
                close();
              }}
            />
            <MobileListRow
              icon={chrome.isFeeding ? spinner : <IconPlayerPlay />}
              label={t("mobileScan.controls.feed")}
              description={t("mobileScan.controls.feedDescription")}
              disabled={sorterDisabled || !chrome.isCameraActive}
              onClick={() => {
                chrome.onFeed();
                close();
              }}
            />
            <MobileListRow
              icon={chrome.isClearingDevice ? spinner : <IconArrowDown />}
              label={t("mobileScan.controls.drop")}
              description={t("mobileScan.controls.dropDescription")}
              disabled={sorterDisabled}
              onClick={chrome.onClearDevice}
            />
            <MobileListRow
              icon={chrome.isResettingDevice ? spinner : <IconRefresh />}
              label={t("mobileScan.controls.neutral")}
              description={t("mobileScan.controls.neutralDescription")}
              disabled={sorterDisabled}
              onClick={chrome.onResetDevice}
            />
          </div>
          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconCpu />}
              label={t("mobileScan.sorter")}
              description={t("mobileScan.controls.sorterDescription")}
              to={MOBILE_SORTER_PATH}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
