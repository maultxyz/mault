import { verifyStorageShareLink } from "@/features/storage/api/storage-share-links";
import { StorageCardBrowser } from "@/features/public-cards/components/storage-card-browser";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import type { SharedStorageLinkState } from "@/lib/interfaces/share-links";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
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
          <StorageCardBrowser
            token={token}
            locationName={linkInfo.locationName}
            purpose={linkInfo.purpose}
          />
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
