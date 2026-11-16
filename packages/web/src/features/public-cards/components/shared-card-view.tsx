import { PoweredByMault } from "@/features/public-cards/components/powered-by-mault";
import { PublicCardDetailView } from "@/features/public-cards/components/public-card-detail";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import type { SharedCardViewProps } from "@/lib/interfaces/public-cards";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function SharedCardView({ token, scanId }: SharedCardViewProps) {
  const { t } = useTranslation("cards");
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.card, linkParams: { token } }),
    [token],
  );

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col bg-background outline-none"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-3 md:px-3 md:py-2">
        <p className="text-xs text-foreground/70">{t("shareCardLink.sharedPage.readOnly")}</p>
        <PoweredByMault />
      </header>
      <PublicCardDetailView source={source} scanId={scanId} />
    </main>
  );
}
