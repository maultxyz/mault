import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRecentBluetoothSorters } from "@/features/scanner/api/use-recent-bluetooth-sorters";
import { useStations } from "@/features/scanner/api/use-stations";
import type { RecentSorterMenuItemsProps } from "@/lib/interfaces/scanner";
import { IconBluetooth } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function RecentSorterMenuItems({
  onSelect,
  disabled,
}: RecentSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const recentSorters = useRecentBluetoothSorters();
  const { isDeviceConnected } = useStations();
  if (recentSorters.length === 0) return null;

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{t("recentSorters.title")}</DropdownMenuLabel>
        {recentSorters.map((sorter) => {
          const connected = isDeviceConnected(sorter.deviceGuid);
          return (
            <DropdownMenuItem
              key={sorter.id}
              disabled={disabled || connected}
              onClick={() => onSelect(sorter.bluetoothDevice ?? undefined)}
            >
              <IconBluetooth />
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
