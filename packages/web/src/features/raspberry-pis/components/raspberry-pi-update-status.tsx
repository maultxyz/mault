import { Button } from "@/components/ui/button";
import { useRaspberryPiUpdate } from "@/features/raspberry-pis/api/use-raspberry-pis";
import type { RaspberryPiUpdateStatusProps } from "@/lib/interfaces/raspberry-pis";
import { piHostUpdateControls } from "@magic-vault/shared";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function RaspberryPiUpdateStatus({ host, canManage }: RaspberryPiUpdateStatusProps) {
  const { t } = useTranslation("settings");
  const update = useRaspberryPiUpdate(host.guid);
  const controls = piHostUpdateControls(host);
  if (!controls.statusKey) return null;

  if (controls.statusKey === "updating") {
    return (
      <p role="status" className="text-xs text-foreground/70">
        {t("raspberryPis.update.updating")}
      </p>
    );
  }

  const isScanning = host.connected && !controls.canUpdate;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p role="status" className="text-xs">
        {controls.statusKey === "failed"
          ? t("raspberryPis.update.failed", { version: controls.installedVersion ?? "" })
          : t("raspberryPis.update.available", { version: controls.latestVersion ?? "" })}
      </p>
      {canManage && controls.canUpdate && (
        <Button
          type="button"
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.mutate()}
        >
          {update.isPending ? <IconLoader2 className="animate-spin" /> : <IconDownload />}
          {controls.statusKey === "failed"
            ? t("raspberryPis.update.retry")
            : t("raspberryPis.update.button")}
        </Button>
      )}
      {canManage && isScanning && (
        <p className="text-xs text-foreground/70">{t("raspberryPis.update.stopScanFirst")}</p>
      )}
    </div>
  );
}
