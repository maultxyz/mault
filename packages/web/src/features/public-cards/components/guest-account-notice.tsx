import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { claimOutgoingTradeOffersOnce } from "@/features/trade-offers/api/outgoing-trade-offers";
import { useAuthSession } from "@/lib/auth";
import { signInPathReturningTo } from "@/lib/auth-redirect";
import type { GuestAccountNoticeProps } from "@/lib/interfaces/public-cards";
import { IconLogin2, IconUserCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function GuestAccountNotice({
  kind,
  isAccountRequired,
  onBeforeSignIn,
}: GuestAccountNoticeProps) {
  const { t } = useTranslation("cards");
  const location = useLocation();
  const { data, isPending } = useAuthSession();
  const signedInUser = data?.user ?? null;
  const signedInUserId = signedInUser?.id ?? null;

  useEffect(() => {
    if (kind === "tradeOffers" && signedInUserId) void claimOutgoingTradeOffersOnce(signedInUserId);
  }, [kind, signedInUserId]);

  if (isPending) return null;

  if (signedInUser) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-foreground/70">
        <IconUserCheck aria-hidden className="mt-px size-3.5 shrink-0" />
        <span>
          {t("publicBrowse.signedInAs", { name: signedInUser.name || signedInUser.email })}{" "}
          {t(`${kind}.account.signedInHint`)}
        </span>
      </p>
    );
  }

  return (
    <Callout
      variant={isAccountRequired ? "warning" : "info"}
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
          {t("publicBrowse.logIn")}
        </Button>
      }
    >
      {isAccountRequired ? t(`${kind}.account.logInRequiredHint`) : t(`${kind}.account.logInHint`)}
    </Callout>
  );
}
