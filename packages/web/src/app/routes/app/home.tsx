import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { HomeDashboard } from "@/features/home/components/home-dashboard";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("home");
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && <MobilePageHeader title={t("title")} />}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
        {!isMobile && <PageHeader title={t("title")} />}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:px-3 md:py-2">
          <HomeDashboard />
        </div>
      </div>
    </div>
  );
}
