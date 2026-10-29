import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileListRow } from "@/components/mobile-list-row";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobileCameraSheetProps } from "@/lib/interfaces/scanner";
import { IconCamera } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileCameraSheet({
  open,
  onOpenChange,
  chrome,
}: MobileCameraSheetProps) {
  const { t } = useTranslation("scanner");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DrawerTitle className="font-heading text-base font-semibold text-foreground">
            {t("mobileScan.chooseCamera")}
          </DrawerTitle>
          <div className={MOBILE_LIST_CLASS}>
            {chrome.cameras.map((camera, index) => (
              <MobileListRow
                key={camera.deviceId}
                label={
                  camera.label ||
                  t("mobileScan.cameraFallback", { number: index + 1 })
                }
                selected={camera.deviceId === chrome.selectedCameraId}
                leading={
                  <MobileIconBadge>
                    <IconCamera />
                  </MobileIconBadge>
                }
                onClick={() => {
                  if (camera.deviceId !== chrome.selectedCameraId) {
                    chrome.onSelectCamera(camera.deviceId);
                  }
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
