import { MobileListRow } from "@/components/mobile-list-row";
import { MobileSection } from "@/components/mobile-section";
import { useRecentSorters } from "@/features/scanner/api/use-recent-sorters";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobileRecentSortersProps } from "@/lib/interfaces/scanner";
import { IconBluetooth, IconLoader2, IconUsb } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileRecentSorters({
  disabled,
  connectingId,
  onConnect,
}: MobileRecentSortersProps) {
  const { t } = useTranslation("scanner");
  const recentSorters = useRecentSorters();
  if (recentSorters.length === 0) return null;

  return (
    <MobileSection title={t("recentSorters.title")}>
      <div className={MOBILE_LIST_CLASS}>
        {recentSorters.map((sorter) => (
          <MobileListRow
            key={sorter.id}
            icon={
              connectingId === sorter.id ? (
                <IconLoader2 className="animate-spin" />
              ) : sorter.transport === "usb" ? (
                <IconUsb />
              ) : (
                <IconBluetooth />
              )
            }
            label={sorter.name}
            disabled={disabled}
            onClick={() => onConnect(sorter)}
          />
        ))}
      </div>
    </MobileSection>
  );
}
