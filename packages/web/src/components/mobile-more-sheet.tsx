import { MobileSegmentedControl } from "@/components/mobile-segmented-control";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { getInitials } from "@/components/ui/initials-avatar";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useOrg } from "@/features/companies/api/use-organization";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL, SHOP_URL } from "@/lib/constants/links";
import { LANGUAGE_NATIVE_NAMES } from "@/lib/constants/languages";
import {
  MOBILE_ICON_TILE_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_LIST_ROW_CLASS,
  MOBILE_SECTION_CLASS,
  MOBILE_SECTION_LABEL_CLASS,
  THEME_OPTIONS,
} from "@/lib/constants/nav";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type {
  MobileMenuRowProps,
  MobileMoreSheetProps,
  ThemeOption,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconActivityHeartbeat,
  IconArrowUpRight,
  IconBrandDiscord,
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconLanguage,
  IconLogout,
  IconShoppingCart,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { SupportedLanguage } from "@/lib/interfaces/languages";

function MobileMenuRow({
  icon,
  label,
  value,
  external,
  onClick,
}: MobileMenuRowProps) {
  return (
    <button type="button" onClick={onClick} className={MOBILE_LIST_ROW_CLASS}>
      <span className={MOBILE_ICON_TILE_CLASS}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value && <span className="shrink-0 text-foreground/70">{value}</span>}
      {external ? (
        <IconArrowUpRight className="size-4 shrink-0 text-foreground/70" />
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
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-foreground">
                {name || email}
              </p>
              {name && email && (
                <p className="truncate text-xs text-foreground/70">{email}</p>
              )}
            </div>
          </div>

          {orgs.length > 0 && (
            <section className={MOBILE_SECTION_CLASS}>
              <h2 className={MOBILE_SECTION_LABEL_CLASS}>
                {tCompanies("orgSwitcher.organizations")}
              </h2>
              <div className={MOBILE_LIST_CLASS}>
                {orgs.map((org) => {
                  const isActive = org.id === activeOrg?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => {
                        if (!isActive) void setActiveOrg(org.id);
                      }}
                      className={MOBILE_LIST_ROW_CLASS}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold",
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

          <section className={MOBILE_LIST_CLASS}>
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
            <h2 className={MOBILE_SECTION_LABEL_CLASS}>
              {t("mobileMenu.theme")}
            </h2>
            <MobileSegmentedControl
              label={t("mobileMenu.theme")}
              items={THEME_OPTIONS.map((option) => ({
                key: option,
                label: t(`theme.${option}`),
              }))}
              value={(theme ?? "system") as ThemeOption}
              onChange={setTheme}
            />
          </section>

          <section className={MOBILE_LIST_CLASS}>
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

          <div className={MOBILE_LIST_CLASS}>
            <button
              type="button"
              className={cn(MOBILE_LIST_ROW_CLASS, "text-destructive")}
              onClick={() => {
                onOpenChange(false);
                void signOut();
              }}
            >
              <span className={cn(MOBILE_ICON_TILE_CLASS, "text-destructive")}>
                <IconLogout className="size-5" />
              </span>
              {t("userMenu.signOut")}
            </button>
          </div>

          <p className="text-center text-xs text-foreground/70">
            v{__APP_VERSION__}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
