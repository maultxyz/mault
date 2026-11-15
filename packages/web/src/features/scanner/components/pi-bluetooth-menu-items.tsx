import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { useOrg } from "@/features/companies/api/use-organization";
import { getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import type { PiBluetoothCapabilities, PiSorterDevice } from "@magic-vault/shared";
import type { PiSorterMenuItemsProps } from "@/lib/interfaces/stations";

export function PiBluetoothMenuItems({ onSelect, disabled }: PiSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const { data: capabilities } = useQuery({
    queryKey: ["pi-bluetooth", activeOrg?.id],
    queryFn: async (): Promise<PiBluetoothCapabilities> => {
      const response = await fetch(`${API_BASE}/api/pi-serial/bluetooth`, { headers: await getAuthHeaders() });
      return response.ok ? response.json() : { supported: false };
    },
    enabled: !!activeOrg?.id,
    retry: false,
  });
  const { data: devices, isFetching, isError, refetch } = useQuery({
    queryKey: ["pi-bluetooth-sorters", activeOrg?.id],
    queryFn: async (): Promise<PiSorterDevice[]> => {
      const response = await fetch(`${API_BASE}/api/pi-serial/bluetooth/devices`, { method: "POST", headers: await getAuthHeaders() });
      if (!response.ok) throw new Error("Could not discover Bluetooth sorters");
      return (await response.json()).devices;
    },
    enabled: !!activeOrg?.id && capabilities?.powered === true && open,
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
  if (!capabilities?.supported) return null;
  if (!capabilities.powered) return <DropdownMenuItem disabled>{t("piHardware.bluetoothOff")}</DropdownMenuItem>;
  return <DropdownMenuSub open={open} onOpenChange={setOpen}>
    <DropdownMenuSubTrigger disabled={disabled}>{t("scannerMenu.connectBluetooth")}</DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      {isFetching ? <DropdownMenuItem disabled><span role="status">{t("piHardware.bluetoothScanning")}</span></DropdownMenuItem> : <>
        {isError ? <DropdownMenuItem disabled><span role="alert">{t("piHardware.bluetoothFailed")}</span></DropdownMenuItem> : !devices?.length && <DropdownMenuItem disabled><span role="status">{t("piHardware.bluetoothEmpty")}</span></DropdownMenuItem>}
        {!isError && devices?.map((device) => <DropdownMenuItem key={device.id} disabled={disabled || device.busy} onClick={() => onSelect(device.id)}>{device.label}</DropdownMenuItem>)}
        <DropdownMenuItem closeOnClick={false} onClick={() => void refetch()}>{t("piHardware.bluetoothRescan")}</DropdownMenuItem>
      </>}
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
}
