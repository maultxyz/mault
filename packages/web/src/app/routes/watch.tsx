import { Badge } from "@/components/ui/badge";
import { verifyMonitorLink } from "@/features/collections/api/monitor-links";
import { useSharedSessionMonitor } from "@/features/scanner/api/use-shared-session-monitor";
import { SessionMonitorView } from "@/features/scanner/components/session-monitor-view";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { WATCH_TOKEN_PARAM } from "@/lib/constants/nav";
import { DEFAULT_PRICE_SOURCE } from "@magic-vault/shared";
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
  const token = searchParams.get(WATCH_TOKEN_PARAM);
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
  const cardsSource = useMemo(
    () => ({ collectionGuid: collectionGuid ?? "", shareToken: token }),
    [collectionGuid, token],
  );

  useEffect(() => {
    if (session.status === "error") setCheckCount((n) => n + 1);
  }, [session.status]);

  if (link.status !== "valid") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        {link.status === "checking" ? (
          <IconLoader2 className="size-6 animate-spin text-foreground/70" />
        ) : (
          <>
            <IconLinkOff className="size-8 text-foreground/70" />
            <p className="text-base font-semibold">
              {t("watchPage.invalidTitle")}
            </p>
            <p className="max-w-sm text-sm text-foreground/70">
              {t("watchPage.invalidDescription")}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <QueryClientProvider client={publicQueryClient}>
      <PriceSourceProvider value={link.info.priceSource ?? DEFAULT_PRICE_SOURCE}>
      <div className="flex h-dvh flex-col bg-background">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <p className="truncate text-sm font-semibold">
            {link.info.collectionName}
          </p>
          <Badge variant="secondary">{t("watchPage.liveBadge")}</Badge>
          <p className="ml-auto hidden text-xs text-foreground/70 sm:block">
            {t("watchPage.readOnly")}
          </p>
        </header>
        <SessionMonitorView
          session={session}
          cardsSource={cardsSource}
          showBinLocation={false}
        />
      </div>
      </PriceSourceProvider>
    </QueryClientProvider>
  );
}
