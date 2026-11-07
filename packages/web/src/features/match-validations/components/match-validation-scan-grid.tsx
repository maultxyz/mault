import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { matchValidationScansQueryOptions } from "@/features/match-validations/api/match-validations";
import { MatchValidationScanTile } from "@/features/match-validations/components/match-validation-scan-tile";
import { MatchValidationSummary } from "@/features/match-validations/components/match-validation-summary";
import { MATCH_VALIDATION_SCANS_PAGE_SIZE } from "@/lib/constants/match-validations";
import { toServerPagination } from "@/lib/pagination";
import { IconCards } from "@tabler/icons-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MatchValidationScanGrid() {
  const isMobile = useIsMobile();
  const { t } = useTranslation("matchValidations");
  const [page, setPage] = useState(1);
  const { data, isPending } = useQuery(matchValidationScansQueryOptions(page));
  const pagination = toServerPagination(data, setPage);

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: MATCH_VALIDATION_SCANS_PAGE_SIZE }, (_, index) => (
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
    <div className="flex flex-col gap-4">
      {isMobile && (
        <MatchValidationSummary className="sticky top-0 z-10 bg-background py-2" />
      )}
      <ul
        aria-label={t("scans.listLabel")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {data.items.map((scan) => (
          <MatchValidationScanTile key={scan.scanId} scan={scan} />
        ))}
      </ul>
      <ListPagination pagination={pagination} />
    </div>
  );
}
