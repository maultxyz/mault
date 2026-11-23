import { useAuthSession } from "@/lib/auth";
import { signInPathReturningTo } from "@/lib/auth-redirect";
import { MY_RESERVATIONS_PATH, SENT_TRADES_PATH } from "@/lib/constants/trade-offers";
import type { GuestAccountKind } from "@/lib/interfaces/public-cards";
import { toast } from "@/lib/toast";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const ACCOUNT_PAGE_BY_KIND: Record<GuestAccountKind, string> = {
  tradeOffers: SENT_TRADES_PATH,
  reservations: MY_RESERVATIONS_PATH,
};

export function useGuestAccount(kind: GuestAccountKind, isAccountRequired: boolean) {
  const { t } = useTranslation("cards");
  const navigate = useNavigate();
  const { data, isPending } = useAuthSession();
  const isSignedIn = !!data?.user;
  const mustLogIn = isAccountRequired && !isSignedIn;

  const promptGuestToLogIn = useCallback(() => {
    if (isPending || isSignedIn) return;
    toast.info(t(`${kind}.account.sentLogInPrompt`), {
      action: {
        label: t("publicBrowse.logIn"),
        onClick: () => navigate(signInPathReturningTo(ACCOUNT_PAGE_BY_KIND[kind])),
      },
    });
  }, [isPending, isSignedIn, kind, navigate, t]);

  return { mustLogIn, promptGuestToLogIn };
}
