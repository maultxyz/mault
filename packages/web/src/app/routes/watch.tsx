import { CardHoldsProvider } from "@/features/card-holds/components/card-holds-provider";
import { verifyMonitorLink } from "@/features/collections/api/monitor-links";
import { useSharedSessionMonitor } from "@/features/scanner/api/use-shared-session-monitor";
import { WatchCardBrowser } from "@/features/public-cards/components/watch-card-browser";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import {
  SHARE_LINK_TOKEN_PARAM,
  DEFAULT_ORG_PRICING,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { publicQueryClient } from "@/lib/query-client";
import type { WatchLinkState } from "@/lib/interfaces/collections";
import { IconLinkOff, IconLoader2 } from "@tabler/icons-react";
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
        if (!cancelled) setLink({ status: "invalid" });
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
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center outline-none"
      >
        {link.status === "checking" ? (
          <IconLoader2 className="size-6 animate-spin text-foreground/70" />
        ) : (
          <>
            <IconLinkOff className="size-8 text-foreground/70" />
            <h1 className="text-base font-semibold">
              {t("watchPage.invalidTitle")}
            </h1>
            <p className="max-w-sm text-sm text-foreground/70">
              {t("watchPage.invalidDescription")}
            </p>
          </>
        )}
      </main>
    );
  }

  return (
    <QueryClientProvider client={publicQueryClient}>
      <PriceSourceProvider value={pricing}>
        <CardHoldsProvider
          kind="collection"
          token={token ?? ""}
          holdMinutes={link.info.holdMinutes ?? null}
        >
          <WatchCardBrowser
            token={token ?? ""}
            collectionGuid={collectionGuid ?? ""}
            collectionName={link.info.collectionName}
            holdMinutes={link.info.holdMinutes ?? null}
            session={session}
          />
        </CardHoldsProvider>
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
