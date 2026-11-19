import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { FeatureHighlightTimeline } from "@/features/feature-highlights/components/feature-highlight-timeline";
import { useDebouncedSearchParamText } from "@/hooks/use-debounced-search-param-text";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { WHATS_NEW_SEARCH_PARAM } from "@/lib/constants/feature-highlights";
import {
  MOBILE_ACCOUNT_PATH,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function WhatsNewPage() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const title = t("featureHighlights.title");
  const { text, setText, debouncedText } = useDebouncedSearchParamText(
    WHATS_NEW_SEARCH_PARAM,
  );
  const timeline = (
    <FeatureHighlightTimeline
      searchText={text}
      onSearchTextChange={setText}
      searchQuery={debouncedText}
    />
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={title} backTo={MOBILE_ACCOUNT_PATH} />
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            MOBILE_NAV_SCROLL_PADDING_CLASS,
          )}
        >
          <div className={MOBILE_PAGE_BODY_CLASS}>
            {timeline}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col p-4 md:px-3 md:py-2">
          {timeline}
        </div>
      </div>
    </div>
  );
}
