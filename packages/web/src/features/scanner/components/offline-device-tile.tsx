import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteDevice } from "@/features/calibration/api/use-delete-device";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCollectionLatestCard } from "@/features/scanner/api/use-collection-latest-card";
import { useStations } from "@/features/scanner/api/use-stations";
import { RenameDeviceButton } from "@/features/scanner/components/rename-device-button";
import { StationOverviewCard } from "@/features/scanner/components/station-overview-card";
import type { OfflineDeviceTileProps } from "@/lib/interfaces/stations";
import { IconPlugConnectedX, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function OfflineDeviceTile({ device }: OfflineDeviceTileProps) {
  const { t } = useTranslation("scanner");
  const { getDevicePrefs } = useStations();
  const { collections } = useCollections();
  const lastCollectionGuid = getDevicePrefs(device.guid)?.collectionGuid;
  const collection = collections.find((c) => c.guid === lastCollectionGuid);
  const { latestCard, totalCount } = useCollectionLatestCard(collection?.guid);
  const deleteDevice = useDeleteDevice();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteLabel = t("stations.overview.delete", { name: device.name });

  return (
    <>
      <StationOverviewCard
        name={device.name}
        status="offline"
        latestCard={latestCard}
        collectionName={collection?.name}
        totalCount={totalCount}
        action={
          <>
            <RenameDeviceButton device={device} />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={deleteLabel}
              title={deleteLabel}
              disabled={deleteDevice.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              <IconTrash />
            </Button>
          </>
        }
        camera={
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/70">
            <IconPlugConnectedX className="size-5" />
            <span className="text-2xs">{t("stations.overview.offline")}</span>
          </div>
        }
      />
      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("stations.overview.deleteConfirm.title", { name: device.name })}
        description={t("stations.overview.deleteConfirm.description")}
        confirm={{ type: "name", name: device.name }}
        onConfirm={() => {
          setConfirmOpen(false);
          deleteDevice.mutate(device);
        }}
      />
    </>
  );
}
