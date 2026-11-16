import { verifyCardShareLink } from "@/features/cards/api/card-share-links";
import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import { SharedCardView } from "@/features/public-cards/components/shared-card-view";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import type { SharedCardLinkState } from "@/lib/interfaces/share-links";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function SharedCardPage() {
  const { t } = useTranslation("cards");
  const [searchParams] = useSearchParams();
  const token = searchParams.get(SHARE_LINK_TOKEN_PARAM);
  const [link, setLink] = useState<SharedCardLinkState>({ status: "checking" });
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setLink({ status: "invalid" });
      return;
    }
    let cancelled = false;
    verifyCardShareLink(token)
      .then((result) => {
        if (cancelled) return;
        setLink(
          result.success && result.data
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
  }, [token, checkCount]);

  const linkInfo = link.status === "valid" ? link.info : undefined;
  const pricing = useMemo<OrgPricing | null>(
    () =>
      linkInfo
        ? {
            source: linkInfo.priceSource,
            conditionMultipliers: toConditionMultipliers(linkInfo.conditionMultipliers),
          }
        : null,
    [linkInfo],
  );

  useEffect(() => {
    if (linkInfo) document.title = `${linkInfo.cardName} · Mault`;
  }, [linkInfo]);

  if (!linkInfo || !pricing || !token) {
    return (
      <ShareLinkStatusScreen
        status={link.status === "valid" ? "invalid" : link.status}
        invalidTitle={t("shareCardLink.sharedPage.invalidTitle")}
        invalidDescription={t("shareCardLink.sharedPage.invalidDescription")}
        onRetry={() => {
          setLink({ status: "checking" });
          setCheckCount((count) => count + 1);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={publicQueryClient}>
      <PriceSourceProvider value={pricing}>
        <SharedCardView token={token} scanId={linkInfo.scanId} />
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
