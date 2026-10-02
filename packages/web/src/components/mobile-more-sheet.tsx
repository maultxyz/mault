import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { getInitials } from "@/components/ui/initials-avatar";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useOrg } from "@/features/companies/api/use-organization";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL, SHOP_URL } from "@/lib/constants/links";
import {
  LANGUAGE_NATIVE_NAMES,
  type SupportedLanguage,
} from "@/lib/constants/languages";
import { THEME_OPTIONS } from "@/lib/constants/nav";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type {
  MobileMenuRowProps,
  MobileMoreSheetProps,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconActivityHeartbeat,
  IconBrandDiscord,
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconLanguage,
  IconLogout,
  IconShoppingCart,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function MobileMenuRow({
  icon,
  label,
  value,
  external,
  onClick,
}: MobileMenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-3 text-left text-sm text-foreground active:bg-muted"
    >
      <span className="shrink-0 text-foreground/70">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value && <span className="shrink-0 text-foreground/70">{value}</span>}
      {external ? (
        <IconExternalLink className="size-4 shrink-0 text-foreground/70" />
      ) : (
        <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
      )}
    </button>
  );
}

export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const { t, i18n } = useTranslation("common");
  const { t: tCompanies } = useTranslation("companies");
  const { t: tSettings } = useTranslation("settings");
  const { t: tHealth } = useTranslation("health");
  const navigate = useNavigate();
  const { data } = useAuthSession();
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();

  const name = data?.user?.name ?? undefined;
  const email = data?.user?.email;
  const language = i18n.language as SupportedLanguage;

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const openExternal = (url: string) => {
    onOpenChange(false);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerTitle className="sr-only">{t("nav.more")}</DrawerTitle>
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {name || email}
              </p>
              {name && email && (
                <p className="truncate text-sm text-foreground/70">{email}</p>
              )}
            </div>
          </div>

          {orgs.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-foreground/70">
                {tCompanies("orgSwitcher.organizations")}
              </h2>
              <div className="flex flex-col divide-y overflow-hidden rounded-lg border">
                {orgs.map((org) => {
                  const isActive = org.id === activeOrg?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => {
                        if (!isActive) void setActiveOrg(org.id);
                      }}
                      className="flex min-h-12 items-center gap-3 px-3 text-left text-sm text-foreground active:bg-muted"
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground/70",
                        )}
                      >
                        {org.name[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {org.name}
                      </span>
                      {isActive && (
                        <IconCheck className="size-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
                <MobileMenuRow
                  icon={<IconBuilding className="size-5" />}
                  label={tCompanies("orgSwitcher.manageOrganizations")}
                  onClick={() => go(SETTINGS_PATHS.organization)}
                />
              </div>
            </section>
          )}

          <section className="flex flex-col divide-y overflow-hidden rounded-lg border">
            <MobileMenuRow
              icon={<IconUserCircle className="size-5" />}
              label={t("breadcrumb.account")}
              onClick={() => go("/app/account/settings")}
            />
            <MobileMenuRow
              icon={<IconLanguage className="size-5" />}
              label={tSettings("appearance.language")}
              value={LANGUAGE_NATIVE_NAMES[language] ?? language}
              onClick={() => go(SETTINGS_PATHS.general)}
            />
            <MobileMenuRow
              icon={<IconActivityHeartbeat className="size-5" />}
              label={tHealth("title")}
              onClick={() => go("/app/health")}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-foreground/70">
              {t("mobileMenu.theme")}
            </h2>
            <ButtonGroup className="w-full">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option}
                  aria-pressed={theme === option}
                  variant={theme === option ? "outline-selected" : "outline"}
                  className="h-8 flex-1 text-sm"
                  onClick={() => setTheme(option)}
                >
                  {t(`theme.${option}`)}
                </Button>
              ))}
            </ButtonGroup>
          </section>

          <section className="flex flex-col divide-y overflow-hidden rounded-lg border">
            <MobileMenuRow
              icon={<IconShoppingCart className="size-5" />}
              label={t("nav.cart")}
              external
              onClick={() => openExternal(SHOP_URL)}
            />
            <MobileMenuRow
              icon={<IconBrandDiscord className="size-5" />}
              label={t("nav.discord")}
              external
              onClick={() => openExternal(DISCORD_URL)}
            />
          </section>

          <Button
            variant="outline"
            className="h-11 w-full text-destructive"
            onClick={() => {
              onOpenChange(false);
              void signOut();
            }}
          >
            <IconLogout className="size-4" />
            {t("userMenu.signOut")}
          </Button>

          <p className="text-center text-xs text-foreground/70">
            v{__APP_VERSION__}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
