import { Button } from "@/components/ui/button";
import type { ListPaginationProps } from "@/lib/interfaces/pagination";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ListPagination({ pagination, compact }: ListPaginationProps) {
  const { t } = useTranslation("common");
  const { page, pageCount, from, to, total, setPage } = pagination;

  if (pageCount <= 1) return null;

  if (compact) {
    return (
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("pagination.previous")}
          title={t("pagination.previous")}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <IconChevronLeft />
        </Button>
        <span className="text-xs tabular-nums text-foreground/70">
          {t("pagination.page", { page, count: pageCount })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("pagination.next")}
          title={t("pagination.next")}
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          <IconChevronRight />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs tabular-nums text-foreground/70">
        {t("pagination.range", { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <IconChevronLeft />
          {t("pagination.previous")}
        </Button>
        <span className="text-xs tabular-nums text-foreground/70">
          {t("pagination.page", { page, count: pageCount })}
        </span>
        <Button
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          {t("pagination.next")}
          <IconChevronRight />
        </Button>
      </div>
    </div>
  );
}
