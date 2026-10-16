import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileListRow } from "@/components/mobile-list-row";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { MobileSection } from "@/components/mobile-section";
import { MobileSegmentedControl } from "@/components/mobile-segmented-control";
import { getInitials } from "@/components/ui/initials-avatar";
import { useSignOut } from "@/features/account/api/use-sign-out";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL, SHOP_URL } from "@/lib/constants/links";
import { LANGUAGE_NATIVE_NAMES } from "@/lib/constants/languages";
import {
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
  THEME_OPTIONS,
} from "@/lib/constants/nav";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { STATS_PATH } from "@/lib/constants/stats";
import type { SupportedLanguage } from "@/lib/interfaces/languages";
import type { ThemeOption } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconActivityHeartbeat,
  IconBrandDiscord,
  IconBuilding,
  IconChartBar,
  IconLanguage,
  IconLogout,
  IconSettings,
  IconShoppingCart,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

export default function MePage() {
  const { t, i18n } = useTranslation("common");
  const { t: tCompanies } = useTranslation("companies");
  const { t: tSettings } = useTranslation("settings");
  const { t: tHealth } = useTranslation("health");
  const isMobile = useIsMobile();
  const { data } = useAuthSession();
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();

  if (!isMobile) return <Navigate to={SETTINGS_PATHS.root} replace />;

  const name = data?.user?.name ?? undefined;
  const email = data?.user?.email;
  const language = i18n.language as SupportedLanguage;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader title={t("mobileTabs.account")} />
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className={MOBILE_PAGE_BODY_CLASS}>
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
              {getInitials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-bold text-foreground">
                {name || email}
              </p>
              {name && email && (
                <p className="truncate text-sm text-foreground/70">{email}</p>
              )}
            </div>
          </div>

          {orgs.length > 0 && (
            <MobileSection title={tCompanies("orgSwitcher.organizations")}>
              <div className={MOBILE_LIST_CLASS}>
                {orgs.map((org) => {
                  const isActive = org.id === activeOrg?.id;
                  return (
                    <MobileListRow
                      key={org.id}
                      label={org.name}
                      selected={isActive}
                      leading={
                        <MobileIconBadge
                          className={
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : undefined
                          }
                        >
                          {org.name[0]?.toUpperCase()}
                        </MobileIconBadge>
                      }
                      onClick={() => {
                        if (!isActive) void setActiveOrg(org.id);
                      }}
                    />
                  );
                })}
                <MobileListRow
                  icon={<IconBuilding />}
                  label={tCompanies("orgSwitcher.manageOrganizations")}
                  to={SETTINGS_PATHS.organization}
                />
              </div>
            </MobileSection>
          )}

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconSettings />}
              label={t("nav.settings")}
              to={SETTINGS_PATHS.root}
            />
            <MobileListRow
              icon={<IconUserCircle />}
              label={t("breadcrumb.account")}
              to="/app/account/settings"
            />
            <MobileListRow
              icon={<IconLanguage />}
              label={tSettings("appearance.language")}
              value={LANGUAGE_NATIVE_NAMES[language] ?? language}
              to={SETTINGS_PATHS.general}
            />
            <MobileListRow
              icon={<IconChartBar />}
              label={t("nav.stats")}
              to={STATS_PATH}
            />
            <MobileListRow
              icon={<IconActivityHeartbeat />}
              label={tHealth("title")}
              to="/app/health"
            />
          </div>

          <MobileSection title={t("mobileMenu.theme")}>
            <MobileSegmentedControl
              label={t("mobileMenu.theme")}
              items={THEME_OPTIONS.map((option) => ({
                key: option,
                label: t(`theme.${option}`),
              }))}
              value={(theme ?? "system") as ThemeOption}
              onChange={setTheme}
            />
          </MobileSection>

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconShoppingCart />}
              label={t("nav.cart")}
              href={SHOP_URL}
            />
            <MobileListRow
              icon={<IconBrandDiscord />}
              label={t("nav.discord")}
              href={DISCORD_URL}
            />
          </div>

          <div className={MOBILE_LIST_CLASS}>
            <MobileListRow
              icon={<IconLogout />}
              label={t("userMenu.signOut")}
              destructive
              onClick={() => void signOut()}
            />
          </div>

          <p className="text-center text-xs text-foreground/70">
            v{__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
