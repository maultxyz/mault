import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { claimOutgoingTradeOffersOnce } from "@/features/trade-offers/api/outgoing-trade-offers";
import { useAuthSession } from "@/lib/auth";
import { signInPathReturningTo } from "@/lib/auth-redirect";
import type { TradeOfferAccountNoticeProps } from "@/lib/interfaces/trade-offers";
import { IconLogin2, IconUserCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function TradeOfferAccountNotice({ onBeforeSignIn }: TradeOfferAccountNoticeProps) {
  const { t } = useTranslation("cards");
  const location = useLocation();
  const { data, isPending } = useAuthSession();
  const signedInUser = data?.user ?? null;
  const signedInUserId = signedInUser?.id ?? null;

  useEffect(() => {
    if (signedInUserId) void claimOutgoingTradeOffersOnce(signedInUserId);
  }, [signedInUserId]);

  if (isPending) return null;

  if (signedInUser) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-foreground/70">
        <IconUserCheck aria-hidden className="mt-px size-3.5 shrink-0" />
        <span>
          {t("tradeOffers.account.signedInAs", {
            name: signedInUser.name || signedInUser.email,
          })}{" "}
          {t("tradeOffers.account.signedInHint")}
        </span>
      </p>
    );
  }

  return (
    <Callout
      variant="info"
      action={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link
              to={signInPathReturningTo(`${location.pathname}${location.search}`)}
              onClick={onBeforeSignIn}
            />
          }
        >
          <IconLogin2 />
          {t("tradeOffers.account.logIn")}
        </Button>
      }
    >
      {t("tradeOffers.account.logInHint")}
    </Callout>
  );
}
