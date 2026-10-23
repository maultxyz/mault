import { Callout } from "@/components/callout";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { AccuracyReportView } from "@/features/business/components/accuracy-report";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import { InventoryReportView } from "@/features/business/components/inventory-report";
import { StaffReportView } from "@/features/business/components/staff-report";
import {
  REPORT_CHECK_PARAM,
  REPORT_COLLECTION_PARAM,
  REPORT_RANGE_PARAM,
} from "@/lib/constants/business";
import type { CollectionReportsProps } from "@/lib/interfaces/business";
import {
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  type StatsRange,
} from "@magic-vault/shared";
import { IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function CollectionReports({ tab }: CollectionReportsProps) {
  const { t } = useTranslation("business");
  const { access } = useBusinessAccess();
  const [params, setParams] = useSearchParams();
  const range =
    STATS_RANGES.find((value) => value === params.get(REPORT_RANGE_PARAM)) ??
    STATS_DEFAULT_RANGE;

  const setParam = (updates: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  const needsCosts = tab === "inventory";

  return (
    <div className="flex flex-col gap-4">
      {access?.isLocked && <BusinessUpgradeCallout />}
      {needsCosts && access && !access.canViewCosts ? (
        <Callout variant="info" icon={IconLock}>
          {t("reports.noCostAccess")}
        </Callout>
      ) : tab === "inventory" ? (
        <InventoryReportView />
      ) : tab === "staff" ? (
        <StaffReportView
          range={range}
          onRangeChange={(value: StatsRange) =>
            setParam({
              [REPORT_RANGE_PARAM]: value === STATS_DEFAULT_RANGE ? null : value,
            })
          }
        />
      ) : (
        <AccuracyReportView
          collectionGuid={params.get(REPORT_COLLECTION_PARAM)}
          checkGuid={params.get(REPORT_CHECK_PARAM)}
          onCollectionChange={(guid) =>
            setParam({ [REPORT_COLLECTION_PARAM]: guid })
          }
          onCheckChange={(guid) => setParam({ [REPORT_CHECK_PARAM]: guid })}
        />
      )}
    </div>
  );
}
