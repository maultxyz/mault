import { AppProviders } from "@/app/providers";
import { AppHotkeys } from "@/components/app-hotkeys";
import { AppNav } from "@/components/app-nav";
import { AlertStack } from "@/components/alert-stack";
import { EnvBanner } from "@/components/env-banner";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { KeyboardShortcutsButton } from "@/components/keyboard-shortcuts-dialog";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { PlanBadge } from "@/components/plan-badge";
import { ScannerPip } from "@/features/scanner/components/scanner-pip";
import { StationTabs } from "@/features/scanner/components/station-tabs";
import { FooterDivider, StatusFooter } from "@/components/status-footer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DONATE_URL } from "@/lib/constants/links";
import {
  MOBILE_NAV_HIDDEN_PATTERN,
  MOBILE_NAV_SPACE_CLASS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconCoffee } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

export default function AppLayout() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const hideMobileNav = MOBILE_NAV_HIDDEN_PATTERN.test(pathname);

  return (
    <AppProviders>
      {isMobile ? (
        <div
          className={cn(
            "relative h-dvh w-dvw overflow-hidden flex flex-col bg-background pt-[env(safe-area-inset-top)]",
            !hideMobileNav && MOBILE_NAV_SPACE_CLASS,
          )}
        >
          <ImpersonationBanner />
          <AlertStack />
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
          {!hideMobileNav && <MobileNav />}
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden p-2 pb-6 bg-muted dark:bg-black relative text-foreground/70">
          <div
            aria-hidden
            className="pointer-events-none absolute top-8 left-8 -translate-x-1/2 -translate-y-1/2 size-60 rounded-full bg-primary/50 blur-[60px]"
          />
          <div className="flex flex-col border rounded-lg size-full overflow-hidden relative">
            <ImpersonationBanner />
            <AlertStack />
            <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
              <AppNav />
              <main className="flex-1 min-w-0 overflow-hidden flex flex-col bg-background/70 dark:bg-background/60">
                <StationTabs />
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </main>
            </div>
          </div>
          <ScannerPip />
          <AppHotkeys />
          <div className="absolute bottom-0 left-0 px-4 h-6 flex items-center w-full gap-3 text-xs">
            <StatusFooter />
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <KeyboardShortcutsButton />
              <FooterDivider />
              {AUTH_PROVIDER !== "local" && <PlanBadge />}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href={DONATE_URL}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("footer.donateAriaLabel")}
                    />
                  }
                  className="flex items-center gap-1 text-foreground/70 hover:text-foreground transition-colors"
                >
                  <IconCoffee size={14} />
                  {t("footer.donate")}
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("footer.donateAriaLabel")}
                </TooltipContent>
              </Tooltip>
              <FooterDivider />
              <div className="flex items-center gap-2">
                <span className="text-foreground/70">
                  v{__APP_VERSION__}
                </span>
                <EnvBanner />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppProviders>
  );
}
