import { PageHeader } from "@/components/page-header";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import type { LibraryPageHeaderProps } from "@/lib/interfaces/library";
import { useTranslation } from "react-i18next";

export function LibraryPageHeader({ view, description, actions, children }: LibraryPageHeaderProps) {
  const { t } = useTranslation("common");
  return (
    <PageHeader
      title={t("nav.library")}
      description={description}
      tabs={<LibraryViewTabs value={view} />}
      actions={actions}
      spansFullWidth
    >
      {children}
    </PageHeader>
  );
}
