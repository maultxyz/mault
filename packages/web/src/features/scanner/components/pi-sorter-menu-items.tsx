import { PiBluetoothMenuItems } from "./pi-bluetooth-menu-items";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import type { PiSorterDevice } from "@magic-vault/shared";
import type { PiSorterMenuItemsProps } from "@/lib/interfaces/stations";
import { useOrg } from "@/features/companies/api/use-organization";

export function PiSorterMenuItems({ onSelect, disabled }: PiSorterMenuItemsProps) {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data, isPending, isError } = useQuery({
    queryKey: ["pi-sorters", activeOrg?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/pi-serial/devices`, { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error("Could not list Pi sorters");
      return (await response.json() as { devices: PiSorterDevice[] }).devices;
    },
    enabled: !!activeOrg?.id,
    refetchInterval: 5000,
  });
  const usbItems = isPending ? <DropdownMenuItem disabled>{t("piHardware.loading")}</DropdownMenuItem>
    : isError ? <DropdownMenuItem disabled>{t("piHardware.unavailable")}</DropdownMenuItem>
    : !data?.length ? <DropdownMenuItem disabled>{t("serial.piMissing")}</DropdownMenuItem>
    : data.map((device) => <DropdownMenuItem key={device.id}
      disabled={disabled || (!device.builtin && device.busy)} onClick={() => onSelect(device.id)}>
      {device.builtin ? t("serial.piSorterBuiltIn") : device.label}
    </DropdownMenuItem>);
  return <>{usbItems}<PiBluetoothMenuItems onSelect={onSelect} disabled={disabled} /></>;
}
