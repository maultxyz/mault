import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useStations } from "@/features/scanner/api/use-stations";
import { ConnectSorterMenuItems } from "@/features/scanner/components/connect-sorter-menu-items";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function ConnectSorterMenuOptions() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const {
    connectAnotherSorter,
    connectAnotherSorterCloud,
    canConnectAnotherSorter,
    sorterLimitIsHardCap,
  } = useStations();

  if (canConnectAnotherSorter) {
    return (
      <ConnectSorterMenuItems
        onConnectUsb={() => connectAnotherSorter("usb")}
        onConnectBluetooth={() => connectAnotherSorter("bluetooth")}
        onConnectCloud={connectAnotherSorterCloud}
      />
    );
  }

  if (sorterLimitIsHardCap) {
    return (
      <DropdownMenuItem disabled>
        {t("stations.hardCapReached.title", { max: MAX_CONNECTED_SORTERS })}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem onClick={() => navigate(SETTINGS_PATHS.billing)}>
      {t("scannerMenu.connectAnotherUpgrade")}
    </DropdownMenuItem>
  );
}
