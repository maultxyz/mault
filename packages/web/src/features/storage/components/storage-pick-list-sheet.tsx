import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { StorageCheckList } from "@/features/storage/components/storage-check-list";
import type { StoragePickListSheetProps } from "@/lib/interfaces/storage";
import { storagePickListRows } from "@magic-vault/shared";
import { IconCards } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StoragePickListSheet({ pickList }: StoragePickListSheetProps) {
  const { t } = useTranslation("storage");
  const { lines, cards, pickedScanIds, pickedCount, setPicked } = pickList;
  const rows = useMemo(
    () => storagePickListRows(lines, cards, pickedScanIds),
    [lines, cards, pickedScanIds],
  );

  if (pickList.isLoading) return <ListSkeleton />;
  if (pickList.isError) {
    return <Callout variant="error">{t("pickList.loadFailed")}</Callout>;
  }
  if (cards.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCards}
        title={t("pickList.emptyTitle")}
        description={t("pickList.emptyDescription")}
      />
    );
  }

  return (
    <StorageCheckList
      rows={rows}
      checkedCount={pickedCount}
      total={cards.length}
      progressLabel={t("pickList.progress", {
        picked: pickedCount,
        total: cards.length,
      })}
      showLocation
      checkLabel={t("pickList.picked")}
      onCheckedChange={setPicked}
    />
  );
}
