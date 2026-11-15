import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { matchValidationScansQueryOptions } from "@/features/match-validations/api/match-validations";
import { MatchValidationScanTile } from "@/features/match-validations/components/match-validation-scan-tile";
import { MatchValidationSummary } from "@/features/match-validations/components/match-validation-summary";
import { setPageSize, usePageSize } from "@/lib/page-size-store";
import type { MatchValidationGameFilterProps } from "@/lib/interfaces/match-validations";
import { toServerPagination } from "@/lib/pagination";
import { IconCards } from "@tabler/icons-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MatchValidationScanGrid({ gameKey }: MatchValidationGameFilterProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("matchValidations");
  const [page, setPage] = useState(1);
  const pageSize = usePageSize();
  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };
  const { data, isPending } = useQuery(matchValidationScansQueryOptions(page, gameKey, pageSize));
  const pagination = toServerPagination(data, setPage);

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: pageSize }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={IconCards}
        title={t("scans.empty.title")}
        description={t("scans.empty.description")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      {isMobile && (
        <MatchValidationSummary className="sticky top-0 z-10 bg-background py-2" />
      )}
      <ListPagination
        pagination={pagination}
        alignsEnd
        pageSize={pageSize}
        onPageSizeChange={changePageSize}
      />
      <ul
        aria-label={t("scans.listLabel")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {data.items.map((scan) => (
          <MatchValidationScanTile key={scan.scanId} scan={scan} />
        ))}
      </ul>
      <ListPagination
        pagination={pagination}
        alignsEnd
        pageSize={pageSize}
        onPageSizeChange={changePageSize}
      />
    </div>
  );
}
