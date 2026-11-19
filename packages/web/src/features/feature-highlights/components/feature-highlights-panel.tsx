import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureHighlightCarousel } from "@/features/feature-highlights/components/feature-highlight-carousel";
import type { FeatureHighlightsPanelProps } from "@/lib/interfaces/feature-highlights";
import { useTranslation } from "react-i18next";

export function FeatureHighlightsPanel({
  status,
  slides,
  onDismiss,
  onRetry,
}: FeatureHighlightsPanelProps) {
  const { t } = useTranslation("common");

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3 md:gap-2" aria-busy="true">
        <span className="sr-only">{t("a11y.loading")}</span>
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-3 md:gap-2">
        <p role="alert" className="text-sm text-foreground/70">
          {t("featureHighlights.loadFailed")}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {t("a11y.retry")}
        </Button>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col gap-3 md:gap-2">
        <p className="text-sm text-foreground/70">
          {t("featureHighlights.empty")}
        </p>
        <Button onClick={onDismiss}>{t("featureHighlights.gotIt")}</Button>
      </div>
    );
  }

  return <FeatureHighlightCarousel slides={slides} onFinish={onDismiss} />;
}
