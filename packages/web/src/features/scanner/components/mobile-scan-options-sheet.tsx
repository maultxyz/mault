import { MobileListRow } from "@/components/mobile-list-row";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  MOBILE_LIST_CLASS,
  MOBILE_SCAN_PAIR_PATH,
  MOBILE_SORTER_PATH,
} from "@/lib/constants/nav";
import type { MobileScanOptionsSheetProps } from "@/lib/interfaces/scanner";
import {
  IconAlbum,
  IconCamera,
  IconCopy,
  IconCpu,
  IconDeviceDesktop,
  IconFocus2,
  IconListDetails,
  IconPlayerTrackNext,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileScanOptionsSheet({
  open,
  onOpenChange,
  chrome,
  onChooseCollection,
  onChoosePreset,
  onChooseCamera,
}: MobileScanOptionsSheetProps) {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { sets, selectedSet } = useBinConfigs();
  const selectedCameraIndex = chrome.cameras.findIndex(
    (camera) => camera.deviceId === chrome.selectedCameraId,
  );
  const selectedCamera = chrome.cameras[selectedCameraIndex];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-lg font-bold text-foreground">
            {t("mobileScan.options")}
          </DrawerTitle>

          <div className={MOBILE_LIST_CLASS}>
            {!chrome.isConnected && (
              <MobileListRow
                icon={<IconFocus2 />}
                label={t("mobileScan.handScan")}
                description={t("mobileScan.handScanDescription")}
                trailing={
                  <Switch
                    checked={chrome.handScan}
                    onCheckedChange={chrome.onHandScanChange}
                    aria-label={t("mobileScan.handScan")}
                  />
                }
              />
            )}
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

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconAlbum />}
              label={t("mobileScan.collection")}
              value={
                activeCollection?.name ?? t("mobileScan.chooseCollection")
              }
              onClick={onChooseCollection}
            />
            {sets.length > 0 && (
              <MobileListRow
                icon={<IconListDetails />}
                label={t("mobileScan.preset")}
                value={selectedSet?.name ?? t("mobileScan.choosePreset")}
                onClick={onChoosePreset}
              />
            )}
            {chrome.cameras.length > 1 && (
              <MobileListRow
                icon={<IconCamera />}
                label={t("mobileScan.camera")}
                value={
                  selectedCamera
                    ? selectedCamera.label ||
                      t("mobileScan.cameraFallback", {
                        number: selectedCameraIndex + 1,
                      })
                    : t("mobileScan.chooseCamera")
                }
                onClick={onChooseCamera}
              />
            )}
          </div>

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
