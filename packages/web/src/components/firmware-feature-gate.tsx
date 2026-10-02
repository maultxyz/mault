import { Callout } from "@/components/callout";
import { useFirmwareFeature } from "@/features/scanner/api/use-firmware-feature";
import type { FirmwareFeatureGateProps } from "@/lib/interfaces/firmware";
import { cn } from "@/lib/utils";
import { IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function FirmwareFeatureGate({
  feature,
  className,
  children,
}: FirmwareFeatureGateProps) {
  const { t } = useTranslation("common");
  const { isLocked, minVersion } = useFirmwareFeature(feature);

  if (!isLocked) return <div className={className}>{children}</div>;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Callout variant="warning" icon={IconLock}>
        {t("firmwareGate.requires", { version: minVersion })}
      </Callout>
      <div inert aria-disabled className="opacity-50 select-none">
        {children}
      </div>
    </div>
  );
}
