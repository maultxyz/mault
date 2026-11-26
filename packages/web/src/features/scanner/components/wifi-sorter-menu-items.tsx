import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useWifiSorters } from "@/features/scanner/api/use-wifi-sorters";
import { CALIBRATE_PATH } from "@/lib/constants/calibration";
import type { WifiSorterMenuItemsProps } from "@/lib/interfaces/sorter-wifi";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function WifiSorterMenuItems({
  onSelect,
  disabled,
  triggerContent,
}: WifiSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { sorters, isLoading } = useWifiSorters(true);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>
        {triggerContent ?? t("scannerMenu.connectWifi")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {isLoading ? (
          <DropdownMenuItem disabled>
            <span role="status">{t("wifiConnect.loading")}</span>
          </DropdownMenuItem>
        ) : sorters.length === 0 ? (
          <>
            <DropdownMenuItem disabled>
              <span role="status">{t("wifiConnect.empty")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`${CALIBRATE_PATH}/connection`)}
            >
              {t("sorterWifi.setUp")}
            </DropdownMenuItem>
          </>
        ) : (
          sorters.map((sorter) => {
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
                <span className="truncate">{sorter.name}</span>
                {status && (
                  <span className="ml-auto pl-2 text-xs text-foreground/70">
                    {status}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
