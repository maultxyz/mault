import { Badge } from "@/components/ui/badge";
import { CardHoldsProvider } from "@/features/card-holds/components/card-holds-provider";
import { verifyStorageShareLink } from "@/features/storage/api/storage-share-links";
import { SharedStorageCards } from "@/features/storage/components/shared-storage-cards";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import type { SharedStorageLinkState } from "@/lib/interfaces/share-links";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
  formatPrice,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { IconLinkOff, IconLoader2 } from "@tabler/icons-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";

export default function SharedStoragePage() {
  const { t } = useTranslation("storage");
  const { t: tCommon } = useTranslation("common");
  const { locationGuid } = useParams<{ locationGuid: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get(SHARE_LINK_TOKEN_PARAM);
  const [link, setLink] = useState<SharedStorageLinkState>({ status: "checking" });

  useEffect(() => {
    if (!token || !locationGuid) {
      setLink({ status: "invalid" });
      return;
    }
    let cancelled = false;
    verifyStorageShareLink(token)
      .then((result) => {
        if (cancelled) return;
        setLink(
          result.success && result.data?.locationGuid === locationGuid
            ? { status: "valid", info: result.data }
            : { status: "invalid" },
        );
      })
      .catch(() => {
        if (!cancelled) setLink({ status: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [token, locationGuid]);

  const linkInfo = link.status === "valid" ? link.info : undefined;
  const pricing = useMemo<OrgPricing | null>(
    () =>
      linkInfo
        ? {
            source: linkInfo.priceSource,
            conditionMultipliers: toConditionMultipliers(
              linkInfo.conditionMultipliers,
            ),
          }
        : null,
    [linkInfo],
  );

  useEffect(() => {
    if (linkInfo) document.title = `${linkInfo.locationName} · Mault`;
  }, [linkInfo]);

  if (!linkInfo || !pricing || !token) {
    return (
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center outline-none"
      >
        {link.status === "checking" ? (
          <IconLoader2
            className="size-6 animate-spin text-foreground/70"
            aria-hidden
          />
        ) : (
          <>
            <IconLinkOff className="size-8 text-foreground/70" aria-hidden />
            <h1 className="text-base font-semibold">
              {t("sharedPage.invalidTitle")}
            </h1>
            <p className="max-w-sm text-sm text-foreground/70">
              {t("sharedPage.invalidDescription")}
            </p>
          </>
        )}
      </main>
    );
  }

  return (
    <QueryClientProvider client={publicQueryClient}>
      <PriceSourceProvider value={pricing}>
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex min-h-dvh flex-col bg-background outline-none"
        >
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-3">
            <h1 className="truncate text-sm font-semibold">
              {linkInfo.locationName}
            </h1>
            <Badge variant="secondary">
              {linkInfo.holdMinutes !== null
                ? tCommon("cardHolds.holdsOpenBadge")
                : t("sharedPage.readOnly")}
            </Badge>
            <p className="w-full text-xs text-foreground/70 sm:ml-auto sm:w-auto">
              {linkInfo.showsPrices
                ? t("page.summary", {
                    count: linkInfo.cardCount,
                    value: formatPrice(linkInfo.totalValue, pricing.source),
                  })
                : t("page.cardCount", { count: linkInfo.cardCount })}
            </p>
          </header>
          <div className="flex-1 p-4">
            <CardHoldsProvider
              kind="storage"
              token={token}
              holdMinutes={linkInfo.holdMinutes ?? null}
            >
              <SharedStorageCards token={token} cardCount={linkInfo.cardCount} />
            </CardHoldsProvider>
          </div>
        </main>
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
