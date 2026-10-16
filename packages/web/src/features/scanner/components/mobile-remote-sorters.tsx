import { MobileListRow } from "@/components/mobile-list-row";
import { MobileSection } from "@/components/mobile-section";
import { Skeleton } from "@/components/ui/skeleton";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { sorterLinksQueryOptions } from "@/features/scanner/api/sorter-link";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobileRemoteSortersProps } from "@/lib/interfaces/sorter-wifi";
import { IconLoader2, IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MobileRemoteSorters({
  disabled,
  onConnect,
  connectingGuid,
}: MobileRemoteSortersProps) {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const devices = useQuery(devicesQueryOptions(activeOrg?.id));
  const links = useQuery(sorterLinksQueryOptions(activeOrg?.id));

  if (devices.isPending || links.isPending) {
    return (
      <MobileSection title={t("mobileSorter.remote.title")}>
        <Skeleton className="h-16 rounded-lg" />
      </MobileSection>
    );
  }

  const linked = (links.data ?? []).filter((link) => link.linked);
  if (linked.length === 0) return null;

  return (
    <MobileSection title={t("mobileSorter.remote.title")}>
      <div className={MOBILE_LIST_CLASS}>
        {linked.map((link) => {
          const name =
            devices.data?.find((device) => device.guid === link.guid)?.name ??
            t("mobileSorter.remote.unnamed");
          const description = link.inUse
            ? t("mobileSorter.remote.inUse")
            : link.online
              ? t("mobileSorter.remote.online")
              : t("mobileSorter.remote.offline");
          return (
            <MobileListRow
              key={link.guid}
              icon={
                connectingGuid === link.guid ? (
                  <IconLoader2 className="animate-spin" />
                ) : link.online ? (
                  <IconWifi />
                ) : (
                  <IconWifiOff />
                )
              }
              label={name}
              description={description}
              disabled={disabled || !link.online || link.inUse}
              onClick={() => void onConnect(link.guid)}
            />
          );
        })}
      </div>
    </MobileSection>
  );
}
