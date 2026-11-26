import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRecentSorters } from "@/features/scanner/api/use-recent-sorters";
import { useStations } from "@/features/scanner/api/use-stations";
import type { RecentSorterMenuItemsProps } from "@/lib/interfaces/scanner";
import { IconBluetooth, IconUsb } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function RecentSorterMenuItems({
  onConnectBluetooth,
  onConnectUsb,
  disabled,
}: RecentSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const recentSorters = useRecentSorters();
  const { isDeviceConnected } = useStations();
  if (recentSorters.length === 0) return null;

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{t("recentSorters.title")}</DropdownMenuLabel>
        {recentSorters.map((sorter) => {
          const connected = isDeviceConnected(sorter.deviceGuid);
          const overUsb = sorter.transport === "usb";
          return (
            <DropdownMenuItem
              key={sorter.id}
              disabled={disabled || connected}
              onClick={() =>
                overUsb
                  ? onConnectUsb(
                      sorter.canReconnectOverUsb
                        ? sorter.deviceGuid
                        : undefined,
                    )
                  : onConnectBluetooth(sorter.bluetoothDevice ?? undefined)
              }
            >
              {overUsb ? <IconUsb /> : <IconBluetooth />}
              <span className="truncate">{sorter.name}</span>
              {connected && (
                <span className="ml-auto pl-2 text-xs text-foreground/70">
                  {t("recentSorters.connected")}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  );
}
