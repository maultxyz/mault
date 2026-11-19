import { verifyMonitorLink } from "@/features/collections/api/monitor-links";
import { useSharedSessionMonitor } from "@/features/scanner/api/use-shared-session-monitor";
import { WatchCardBrowser } from "@/features/public-cards/components/watch-card-browser";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import {
  SHARE_LINK_TOKEN_PARAM,
  DEFAULT_ORG_PRICING,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { publicQueryClient } from "@/lib/query-client";
import type { WatchLinkState } from "@/lib/interfaces/collections";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";

export default function WatchPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get(SHARE_LINK_TOKEN_PARAM);
  const [link, setLink] = useState<WatchLinkState>({ status: "checking" });
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!token || !collectionGuid) {
      setLink({ status: "invalid" });
      return;
    }
    let cancelled = false;
    verifyMonitorLink(token)
      .then((result) => {
        if (cancelled) return;
        setLink(
          result.success && result.data?.collectionGuid === collectionGuid
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
  }, [token, collectionGuid, checkCount]);

  const session = useSharedSessionMonitor(
    link.status === "valid" ? collectionGuid : undefined,
    token,
  );
  const linkInfo = link.status === "valid" ? link.info : undefined;
  const pricing = useMemo<OrgPricing>(
    () => ({
      source: linkInfo?.priceSource ?? DEFAULT_ORG_PRICING.source,
      conditionMultipliers: toConditionMultipliers(
        linkInfo?.conditionMultipliers,
      ),
    }),
    [linkInfo?.priceSource, linkInfo?.conditionMultipliers],
  );

  useEffect(() => {
    if (session.status === "error") setCheckCount((n) => n + 1);
  }, [session.status]);

  if (link.status !== "valid") {
    return (
      <ShareLinkStatusScreen
        status={link.status}
        invalidTitle={t("watchPage.invalidTitle")}
        invalidDescription={t("watchPage.invalidDescription")}
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
          <WatchCardBrowser
            token={token ?? ""}
            collectionGuid={collectionGuid ?? ""}
            collectionName={link.info.collectionName}
            purpose={link.info.purpose}
            requiresGuestContact={link.info.requiresGuestContact !== false}
            session={session}
          />
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
