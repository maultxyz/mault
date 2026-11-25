import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { DividedRowsSkeleton } from "@/components/divided-rows-skeleton";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection, SettingsSections } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useRaspberryPis } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { LinkRaspberryPiDialog } from "@/features/raspberry-pis/components/link-raspberry-pi-dialog";
import { RaspberryPiRow } from "@/features/raspberry-pis/components/raspberry-pi-row";
import { RenameRaspberryPiDialog } from "@/features/raspberry-pis/components/rename-raspberry-pi-dialog";
import type { PiHostSummary } from "@magic-vault/shared";
import { IconCpu, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function RaspberryPisSettings() {
  const { t } = useTranslation("settings");
  const { hosts, canManage, isLoading, isError, refetch, claim, remove, rename } = useRaspberryPis();
  const [isLinking, setIsLinking] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PiHostSummary | null>(null);
  const [renameTarget, setRenameTarget] = useState<PiHostSummary | null>(null);

  return (
    <SettingsSections>
      <SettingsSection
        heading={t("raspberryPis.heading")}
        description={t("raspberryPis.description")}
        action={
          canManage && (
            <Button type="button" variant="outline" onClick={() => setIsLinking(true)}>
              <IconPlus />
              {t("raspberryPis.link")}
            </Button>
          )
        }
      >
        {!canManage && !isLoading && !isError && (
          <Callout variant="neutral">{t("raspberryPis.managersOnly")}</Callout>
        )}
        {isError && (
          <LoadErrorCallout message={t("raspberryPis.loadFailed")} onRetry={() => void refetch()} />
        )}
        {isLoading && <DividedRowsSkeleton rows={2} hasTitleBadge />}
        {!isLoading && !isError && hosts.length === 0 && (
          <EmptyState
            size="compact"
            icon={IconCpu}
            title={t("raspberryPis.empty")}
            description={t("raspberryPis.emptyDescription")}
          />
        )}
        {!isLoading && hosts.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {hosts.map((host) => (
              <RaspberryPiRow
                key={host.guid}
                host={host}
                canManage={canManage}
                onRemove={setRemoveTarget}
                onRename={setRenameTarget}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      <LinkRaspberryPiDialog
        open={isLinking}
        onOpenChange={setIsLinking}
        onLink={claim.mutateAsync}
      />

      <RenameRaspberryPiDialog
        host={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onRename={(guid, name) => rename.mutateAsync({ guid, name })}
      />

      <DeleteDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={t("raspberryPis.removeConfirmTitle", { name: removeTarget?.name ?? "" })}
        description={t("raspberryPis.removeConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("raspberryPis.remove")}
        onConfirm={() => {
          if (removeTarget) remove.mutate(removeTarget.guid);
          setRemoveTarget(null);
        }}
      />
    </SettingsSections>
  );
}
