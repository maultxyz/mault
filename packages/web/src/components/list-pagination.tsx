import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  COMPACT_PAGE_SPREAD_SIBLING_COUNT,
  PAGE_SPREAD_SIBLING_COUNT,
} from "@/lib/constants/pagination";
import type { ListPaginationProps } from "@/lib/interfaces/pagination";
import { clampPage, pageSpread } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

export function ListPagination({
  pagination,
  compact,
  className,
}: ListPaginationProps) {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const { page, pageCount, from, to, total, setPage } = pagination;

  if (pageCount <= 1) return null;

  const isCondensed = compact || isMobile;
  const spread = pageSpread(
    page,
    pageCount,
    isCondensed ? COMPACT_PAGE_SPREAD_SIBLING_COUNT : PAGE_SPREAD_SIBLING_COUNT,
  );
  const hidesPages = spread.some((item) => typeof item !== "number");
  const hasRange = from != null && to != null && total != null && !compact;
  const stepButtonVariant = compact ? "ghost" : "outline";

  const goToPage = (nextPage: number) => {
    const clampedPage = clampPage(nextPage, pageCount);
    if (clampedPage !== page) setPage(clampedPage);
  };

  const submitPageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const requestedPage = Number(new FormData(form).get("page"));
    if (Number.isFinite(requestedPage) && requestedPage > 0) {
      goToPage(requestedPage);
    }
    form.reset();
  };

  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2",
        hasRange ? "justify-between" : "justify-center",
        className,
      )}
    >
      {hasRange && (
        <p className="text-xs tabular-nums text-foreground/70">
          {t("pagination.range", { from, to, total })}
        </p>
      )}
      <nav
        aria-label={t("pagination.label")}
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <Button
          variant={stepButtonVariant}
          size={isCondensed ? "icon" : "default"}
          aria-label={t("pagination.previous")}
          title={t("pagination.previous")}
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <IconChevronLeft />
          {!isCondensed && t("pagination.previous")}
        </Button>
        {spread.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              variant={item === page ? "selected" : "ghost"}
              size="icon"
              className="w-auto min-w-6 px-1.5 tabular-nums max-md:w-auto max-md:min-w-10"
              aria-label={t("pagination.pageNumber", { page: item })}
              aria-current={item === page ? "page" : undefined}
              onClick={() => goToPage(item)}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden
              className="px-0.5 text-xs text-foreground/70"
            >
              …
            </span>
          ),
        )}
        <Button
          variant={stepButtonVariant}
          size={isCondensed ? "icon" : "default"}
          aria-label={t("pagination.next")}
          title={t("pagination.next")}
          disabled={page >= pageCount}
          onClick={() => goToPage(page + 1)}
        >
          {!isCondensed && t("pagination.next")}
          <IconChevronRight />
        </Button>
        {hidesPages && (
          <form
            onSubmit={submitPageJump}
            className="flex items-center gap-1.5"
          >
            {!isCondensed && (
              <span className="text-xs text-foreground/70">
                {t("pagination.goToPage")}
              </span>
            )}
            <Input
              name="page"
              type="number"
              inputMode="numeric"
              min={1}
              max={pageCount}
              placeholder={String(page)}
              aria-label={t("pagination.goToPage")}
              title={t("pagination.goToPage")}
              className="w-14 tabular-nums max-md:w-16"
            />
          </form>
        )}
      </nav>
    </div>
  );
}
