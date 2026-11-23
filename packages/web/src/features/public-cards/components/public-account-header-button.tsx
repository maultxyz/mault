import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserInitials } from "@/components/user-initials";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useAuthSession } from "@/lib/auth";
import { signInPathReturningTo } from "@/lib/auth-redirect";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import { ACCOUNT_SETTINGS_PATH } from "@/lib/constants/nav";
import { MY_RESERVATIONS_PATH, SENT_TRADES_PATH } from "@/lib/constants/trade-offers";
import type { PublicAccountHeaderButtonProps } from "@/lib/interfaces/public-cards";
import { useTradeOfferContext } from "@/lib/trade-offer-context";
import {
  IconArrowsExchange,
  IconBookmark,
  IconLogin2,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function PublicAccountHeaderButton({ isIconOnly = false }: PublicAccountHeaderButtonProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const tradeOffer = useTradeOfferContext();
  const reservations = useCardReservationsContext();
  const { data, isPending } = useAuthSession();
  const signOut = useSignOut({ staysOnPage: true });
  if ((!tradeOffer && !reservations) || isPending) return null;

  const user = data?.user;
  if (!user) {
    const label = t("publicBrowse.logIn");
    return (
      <Button
        variant="outline"
        size={isIconOnly ? "icon" : "default"}
        className={isIconOnly ? "shrink-0" : undefined}
        aria-label={isIconOnly ? label : undefined}
        nativeButton={false}
        render={
          <Link
            to={signInPathReturningTo(`${location.pathname}${location.search}`)}
            onClick={() => tradeOffer?.keepWantedForSignIn()}
          />
        }
      >
        <IconLogin2 />
        {isIconOnly ? null : label}
      </Button>
    );
  }

  const name = user.name || undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" className="shrink-0 rounded-full">
            <UserInitials name={name} />
            <span className="sr-only">{tCommon("userMenu.trigger")}</span>
          </Button>
        }
      />
      <DropdownMenuContent side="bottom" align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {name || user.email}
            </span>
            {name && user.email && (
              <span className="truncate text-xs text-foreground/70">{user.email}</span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(SENT_TRADES_PATH)}>
          <IconArrowsExchange size={14} />
          {t("publicBrowse.myTradeOffers")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(MY_RESERVATIONS_PATH)}>
          <IconBookmark size={14} />
          {t("publicBrowse.myReservations")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(ACCOUNT_SETTINGS_PATH)}>
          <IconUserCircle size={14} />
          {tCommon("breadcrumb.account")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <IconLogout size={14} />
          {tCommon("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
