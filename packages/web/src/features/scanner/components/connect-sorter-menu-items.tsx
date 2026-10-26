import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { WifiSorterMenuItems } from "@/features/scanner/components/wifi-sorter-menu-items";
import type { ConnectSorterMenuItemsProps } from "@/lib/interfaces/sorter-wifi";
import { isWebBluetoothSupported } from "@/lib/web-bluetooth";
import { usePiHost } from "@/hooks/use-pi-host";
import { isRemoteBrowser } from "@/lib/host";
import { useTranslation } from "react-i18next";

export function ConnectSorterMenuItems({
  onConnectUsb,
  onConnectBluetooth,
  onConnectCloud,
  disabled,
}: ConnectSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const piRemote = usePiHost() && isRemoteBrowser();

  return (
    <>
      <DropdownMenuItem disabled={disabled} onClick={() => onConnectUsb()}>
        {t(piRemote ? "scannerMenu.connectPi" : "scannerMenu.connectUsb")}
      </DropdownMenuItem>
      {!piRemote && isWebBluetoothSupported() && (
        <DropdownMenuItem
          disabled={disabled}
          onClick={() => onConnectBluetooth()}
        >
          {t("scannerMenu.connectBluetooth")}
        </DropdownMenuItem>
      )}
      <WifiSorterMenuItems disabled={disabled} onSelect={onConnectCloud} />
    </>
  );
}
