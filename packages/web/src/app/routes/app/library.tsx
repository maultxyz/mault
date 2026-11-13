import { MobilePageHeader } from "@/components/mobile-page-header";
import { LibraryCollectionList } from "@/features/library/components/library-collection-list";
import { LibraryViewTabs } from "@/features/library/components/library-view-tabs";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { MOBILE_NAV_SCROLL_PADDING_CLASS, MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

export default function LibraryPage() {
  const { t } = useTranslation("home");
  const isMobile = useIsMobile();
  if (!isMobile) return <Navigate to={COLLECTIONS_PATH} replace />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader title={t("library.title")}>
        <LibraryViewTabs value="collections" />
      </MobilePageHeader>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
        <div className={MOBILE_PAGE_BODY_CLASS}>
          <LibraryCollectionList />
        </div>
      </div>
    </div>
  );
}
