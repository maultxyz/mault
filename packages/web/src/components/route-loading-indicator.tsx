import { useIsRouteLoadingIndicatorVisible } from "@/lib/route-chunks";
import { useTranslation } from "react-i18next";

export function RouteLoadingIndicator() {
  const { t } = useTranslation("common");
  const isVisible = useIsRouteLoadingIndicatorVisible();

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      {isVisible && (
        <>
          <div
            aria-hidden
            className="size-full animate-pulse bg-primary motion-reduce:animate-none"
          />
          <span className="sr-only">{t("a11y.loading")}</span>
        </>
      )}
    </div>
  );
}
