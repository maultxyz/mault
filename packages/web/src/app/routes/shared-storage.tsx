import { verifyStorageShareLink } from "@/features/storage/api/storage-share-links";
import { StorageCardBrowser } from "@/features/public-cards/components/storage-card-browser";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import type { SharedStorageLinkState } from "@/lib/interfaces/share-links";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
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
  const [checkCount, setCheckCount] = useState(0);

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
        if (!cancelled) setLink({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [token, locationGuid, checkCount]);

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
      <ShareLinkStatusScreen
        status={link.status === "valid" ? "invalid" : link.status}
        invalidTitle={t("sharedPage.invalidTitle")}
        invalidDescription={t("sharedPage.invalidDescription")}
        onRetry={() => {
          setLink({ status: "checking" });
          setCheckCount((n) => n + 1);
        }}
      />
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
