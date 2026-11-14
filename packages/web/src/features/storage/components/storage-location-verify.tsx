import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { useStorageVerify } from "@/features/storage/api/use-storage-verify";
import { ScanCardsPanel } from "@/features/storage/components/scan-cards-panel";
import { StorageCheckList } from "@/features/storage/components/storage-check-list";
import type { StorageLocationVerifyProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import {
  STORAGE_VERIFY_CARDS_MAX,
  storagePickListRows,
} from "@magic-vault/shared";
import {
  IconCamera,
  IconCameraOff,
  IconCards,
  IconRefresh,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageLocationVerify({
  location,
}: StorageLocationVerifyProps) {
  const { t } = useTranslation("storage");
  const verify = useStorageVerify(location.guid);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const rows = useMemo(
    () => storagePickListRows([], verify.cards, verify.verifiedScanIds),
    [verify.cards, verify.verifiedScanIds],
  );
  const hasProgress =
    verify.verifiedCount > 0 || verify.notInLocation.length > 0;
  const allVerified = verify.verifiedCount >= verify.cards.length;

  if (verify.isLoading) return <ListSkeleton />;
  if (verify.isError) {
    return <Callout variant="error">{t("verify.loadFailed")}</Callout>;
  }
  if (verify.cards.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCards}
        title={t("verify.emptyTitle")}
        description={t("verify.emptyDescription")}
      />
    );
  }

  const list = (
    <div className="flex flex-col gap-4 md:gap-2">
      {verify.isTruncated && (
        <Callout variant="warning">
          {t("verify.truncated", { max: STORAGE_VERIFY_CARDS_MAX })}
        </Callout>
      )}
      {allVerified && (
        <Callout variant="success">{t("verify.complete")}</Callout>
      )}
      {verify.notInLocation.length > 0 && (
        <Callout variant="warning" title={t("verify.notInLocationTitle")}>
          <p>{t("verify.notInLocationDescription")}</p>
          <p className="mt-1 font-medium">
            {verify.notInLocation
              .map(({ name, count }) => (count > 1 ? `${count} ${name}` : name))
              .join(", ")}
          </p>
        </Callout>
      )}
      <StorageCheckList
        rows={rows}
        checkedCount={verify.verifiedCount}
        total={verify.cards.length}
        progressLabel={t("verify.progress", {
          verified: verify.verifiedCount,
          total: verify.cards.length,
        })}
        showLocation={false}
        checkLabel={t("verify.verified")}
        onCheckedChange={verify.setVerified}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="mr-auto text-xs text-foreground/70">
          {t("verify.description")}
        </p>
        <Button
          variant={isScanOpen ? "outline-selected" : "default"}
          onClick={() => setIsScanOpen(!isScanOpen)}
        >
          {isScanOpen ? <IconCameraOff /> : <IconCamera />}
          {isScanOpen ? t("verify.scan.stop") : t("verify.scan.button")}
        </Button>
        <Button
          variant="outline"
          disabled={!hasProgress}
          onClick={verify.startOver}
        >
          <IconRefresh />
          {t("verify.startOver")}
        </Button>
      </div>
      <div
        className={cn(
          isScanOpen &&
            "flex flex-col gap-4 md:gap-2 md:grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start",
        )}
      >
        {isScanOpen && (
          <div className="sticky top-0 z-10 md:top-24">
            <ScanCardsPanel
              mode="verify"
              source={{
                cards: verify.cards,
                checkedScanIds: verify.verifiedScanIds,
                setChecked: verify.setVerified,
                onNotListed: verify.addNotInLocation,
              }}
            />
          </div>
        )}
        {list}
      </div>
    </div>
  );
}
