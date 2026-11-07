import { MatchValidationProgress } from "@/components/match-validation-progress";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { ViewTabs } from "@/components/view-tabs";
import { MatchValidationQueue } from "@/features/match-validations/components/match-validation-queue";
import { MatchValidationScanGrid } from "@/features/match-validations/components/match-validation-scan-grid";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MATCH_VALIDATION_REVIEW_VIEW,
  MATCH_VALIDATION_VIEW_PARAM,
  MATCH_VALIDATION_VIEWS,
} from "@/lib/constants/match-validations";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import type { MatchValidationView } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function ValidateMatchesPage() {
  const { t } = useTranslation("matchValidations");
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const requestedView = params.get(MATCH_VALIDATION_VIEW_PARAM);
  const view =
    MATCH_VALIDATION_VIEWS.find((value) => value === requestedView) ??
    MATCH_VALIDATION_REVIEW_VIEW;
  const description = t("description", {
    required: MATCH_VALIDATION_REVIEWS_REQUIRED,
  });

  const viewSwitch = (
    <ViewTabs<MatchValidationView>
      label={t("title")}
      className="border-b-0"
      items={MATCH_VALIDATION_VIEWS.map((value) => ({
        key: value,
        label: t(`views.${value}`),
      }))}
      value={view}
      onChange={(value) =>
        setParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (value === MATCH_VALIDATION_REVIEW_VIEW) {
              next.delete(MATCH_VALIDATION_VIEW_PARAM);
            } else {
              next.set(MATCH_VALIDATION_VIEW_PARAM, value);
            }
            return next;
          },
          { replace: true },
        )
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader title={t("title")} subtitle={description} />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        {!isMobile && (
          <PageHeader
            title={t("title")}
            description={description}
            tabs={viewSwitch}
          />
        )}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
          {isMobile && <MatchValidationProgress />}
          {isMobile && viewSwitch}
          {view === MATCH_VALIDATION_REVIEW_VIEW ? (
            <MatchValidationQueue />
          ) : (
            <MatchValidationScanGrid />
          )}
        </div>
      </div>
    </div>
  );
}
