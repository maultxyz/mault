import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWifiSorters } from "@/features/scanner/api/use-wifi-sorters";
import type { WifiSorterMenuItemsProps } from "@/lib/interfaces/sorter-wifi";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function WifiSorterMenuItems({
  onSelect,
  disabled,
  showSeparator,
}: WifiSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const sorters = useWifiSorters(true);
  if (sorters.length === 0) return null;

  return (
    <>
      {showSeparator && <DropdownMenuSeparator />}
      {sorters.map((sorter) => {
        const available =
          sorter.online && !sorter.inUse && !sorter.connectedHere;
        const status = sorter.connectedHere
          ? t("wifiConnect.connectedHere")
          : sorter.inUse
            ? t("wifiConnect.inUse")
            : sorter.online
              ? null
              : t("wifiConnect.offline");
        return (
          <DropdownMenuItem
            key={sorter.guid}
            disabled={disabled || !available}
            onClick={() => onSelect(sorter.guid)}
          >
            {sorter.online ? <IconWifi /> : <IconWifiOff />}
            <span className="truncate">
              {t("wifiConnect.item", { name: sorter.name })}
            </span>
            {status && (
              <span className="ml-auto pl-2 text-xs text-foreground/70">
                {status}
              </span>
            )}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
