import { MobileListRow } from "@/components/mobile-list-row";
import { MobileSection } from "@/components/mobile-section";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import {
  MOBILE_LIST_CLASS,
  MOBILE_SCAN_PAIR_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import type { MobileScanOptionsSheetProps } from "@/lib/interfaces/scanner";
import {
  IconCopy,
  IconCpu,
  IconDeviceDesktop,
  IconPlayerTrackNext,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileScanOptionsSheet({
  open,
  onOpenChange,
  chrome,
}: MobileScanOptionsSheetProps) {
  const { t } = useTranslation("scanner");
  const close = () => onOpenChange(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-lg font-bold text-foreground">
            {t("mobileScan.options")}
          </DrawerTitle>

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconPlayerTrackNext />}
              label={t("mobileScan.autoFeed")}
              description={t("mobileScan.autoFeedDescription")}
              trailing={
                <Switch
                  checked={chrome.autoFeed}
                  onCheckedChange={chrome.onAutoFeedChange}
                  aria-label={t("mobileScan.autoFeed")}
                />
              }
            />
            <MobileListRow
              icon={<IconCopy />}
              label={t("mobileScan.allowDuplicates")}
              description={t("mobileScan.allowDuplicatesDescription")}
              trailing={
                <Switch
                  checked={chrome.allowDuplicates}
                  onCheckedChange={chrome.onAllowDuplicatesChange}
                  aria-label={t("mobileScan.allowDuplicates")}
                />
              }
            />
          </div>

          {chrome.cameras.length > 1 && (
            <MobileSection title={t("mobileScan.camera")}>
              <div className={MOBILE_LIST_CLASS}>
                {chrome.cameras.map((camera, index) => (
                  <MobileListRow
                    key={camera.deviceId}
                    label={
                      camera.label ||
                      t("mobileScan.cameraFallback", { number: index + 1 })
                    }
                    selected={camera.deviceId === chrome.selectedCameraId}
                    onClick={() => {
                      chrome.onSelectCamera(camera.deviceId);
                      close();
                    }}
                  />
                ))}
              </div>
            </MobileSection>
          )}

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconCpu />}
              label={t("mobileScan.sorter")}
              to={MOBILE_SORTER_PATH}
            />
            <MobileListRow
              icon={<IconDeviceDesktop />}
              label={t("mobileScan.pairDesktop")}
              description={t("mobileScan.pairDesktopDescription")}
              to={MOBILE_SCAN_PAIR_PATH}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
