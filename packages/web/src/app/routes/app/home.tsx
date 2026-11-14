import { MobilePageHeader } from "@/components/mobile-page-header";
import { HomeDashboard } from "@/features/home/components/home-dashboard";
import { GlobalSearchEntry } from "@/features/search/components/global-search-entry";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("home");
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader title={t("title")} titleVisuallyHidden>
          <GlobalSearchEntry />
        </MobilePageHeader>
      )}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-2 md:px-3 md:py-2">
          {!isMobile && (
            <>
              <h1 className="sr-only">{t("title")}</h1>
              <GlobalSearchEntry />
            </>
          )}
          <HomeDashboard />
        </div>
      </div>
    </div>
  );
}
