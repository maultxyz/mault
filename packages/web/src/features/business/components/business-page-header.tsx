import { PageHeader } from "@/components/page-header";
import { ViewTabs } from "@/components/view-tabs";
import { usePlanLockedPath } from "@/hooks/use-plan-locked-path";
import {
  BUSINESS_PAGE_VIEW_PATHS,
  BUSINESS_PAGE_VIEWS,
  ORDERS_PATH,
} from "@/lib/constants/business";
import type { BusinessPageHeaderProps, BusinessPageView } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function BusinessPageHeader({ view, description, actions, children }: BusinessPageHeaderProps) {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const { planLockFor } = usePlanLockedPath();
  const title = t("overview.title");
  return (
    <PageHeader
      title={title}
      description={description}
      actions={actions}
      spansFullWidth
      tabs={
        planLockFor(ORDERS_PATH) ? undefined : (
          <ViewTabs<BusinessPageView>
            label={title}
            className="border-b-0"
            items={BUSINESS_PAGE_VIEWS.map((key) => ({ key, label: t(`views.${key}`) }))}
            value={view}
            onChange={(next) => navigate(BUSINESS_PAGE_VIEW_PATHS[next])}
          />
        )
      }
    >
      {children}
    </PageHeader>
  );
}
