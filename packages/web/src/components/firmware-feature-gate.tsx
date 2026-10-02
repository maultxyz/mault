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
      <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <IconLock size={14} className="shrink-0" />
        {t("firmwareGate.requires", { version: minVersion })}
      </p>
      <div inert aria-disabled className="opacity-50 select-none">
        {children}
      </div>
    </div>
  );
}
