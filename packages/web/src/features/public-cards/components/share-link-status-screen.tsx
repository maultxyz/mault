import { Button } from "@/components/ui/button";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import type { ShareLinkStatusScreenProps } from "@/lib/interfaces/share-links";
import { PoweredByMault } from "@/features/public-cards/components/powered-by-mault";
import { PublicCardsLoadingScreen } from "@/features/public-cards/components/public-cards-loading-screen";
import { IconLinkOff, IconRefresh, IconWifiOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ShareLinkStatusScreen({
  status,
  invalidTitle,
  invalidDescription,
  onRetry,
}: ShareLinkStatusScreenProps) {
  const { t } = useTranslation("common");
  const isFailed = status === "failed";
  const StatusIcon = isFailed ? IconWifiOff : IconLinkOff;

  if (status === "checking") return <PublicCardsLoadingScreen />;

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center outline-none"
    >
      <StatusIcon className="size-8 text-foreground/70" aria-hidden />
      <h1 className="font-heading text-base font-semibold">
        {isFailed ? t("shareLink.checkFailedTitle") : invalidTitle}
      </h1>
      <p role={isFailed ? "alert" : undefined} className="max-w-sm text-sm text-foreground/70">
        {isFailed ? t("shareLink.checkFailedDescription") : invalidDescription}
      </p>
      {isFailed && (
        <Button variant="outline" onClick={onRetry}>
          <IconRefresh />
          {t("a11y.retry")}
        </Button>
      )}
      <PoweredByMault className="mt-6" />
    </main>
  );
}
