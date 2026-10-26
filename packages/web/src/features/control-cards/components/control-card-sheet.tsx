import { EmptyState } from "@/components/empty-state";
import { ControlCardTile } from "@/features/control-cards/components/control-card-tile";
import { CONTROL_CARDS_PER_PAGE } from "@/lib/constants/control-cards";
import type { ControlCardSheetProps } from "@/lib/interfaces/control-cards";
import { IconQrcode } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ControlCardSheet({ entries, onRemove }: ControlCardSheetProps) {
  const { t } = useTranslation("scanner");
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={IconQrcode}
        title={t("controlCards.sheet.emptyTitle")}
        description={t("controlCards.sheet.emptyDescription")}
        className="print:hidden"
      />
    );
  }
  const pages = Array.from(
    { length: Math.ceil(entries.length / CONTROL_CARDS_PER_PAGE) },
    (_, pageIndex) =>
      entries.slice(
        pageIndex * CONTROL_CARDS_PER_PAGE,
        (pageIndex + 1) * CONTROL_CARDS_PER_PAGE,
      ),
  );
  return (
    <div className="flex flex-col gap-6 print:block">
      {pages.map((pageEntries) => (
        <div
          key={pageEntries[0].id}
          className="grid grid-cols-[repeat(auto-fill,63mm)] justify-center gap-[4mm] print:grid-cols-[repeat(3,63mm)] print:gap-0 print:break-after-page print:last:break-after-auto"
        >
          {pageEntries.map((entry) => (
            <ControlCardTile key={entry.id} entry={entry} onRemove={onRemove} />
          ))}
        </div>
      ))}
    </div>
  );
}
