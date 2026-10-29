import { AppProviders } from "@/app/providers";
import { AppHotkeys } from "@/components/app-hotkeys";
import { AppNav } from "@/components/app-nav";
import { AppTopBar } from "@/components/app-top-bar";
import { AlertStack } from "@/components/alert-stack";
import { EnvBanner } from "@/components/env-banner";
import { SeasonalPumpkin, SpiderWeb } from "@/components/halloween-decor";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { IntakeBanner } from "@/features/business/components/intake-banner";
import { KeyboardShortcutsButton } from "@/components/keyboard-shortcuts-dialog";
import { MobileNav } from "@/components/mobile-nav";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { PageTransition } from "@/components/page-transition";
import { PlanBadge } from "@/components/plan-badge";
import { PiScanStatusBar } from "@/features/scanner/components/pi-scan-status-bar";
import { DesktopScannerPip } from "@/features/scanner/components/desktop-scanner-pip";
import { ScannerPip } from "@/features/scanner/components/scanner-pip";
import { FooterDivider, StatusFooter } from "@/components/status-footer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DONATE_URL } from "@/lib/constants/links";
import {
  MOBILE_FRAMED_PANEL_CLASS,
  MOBILE_FRAMED_SHELL_CLASS,
  MOBILE_IMMERSIVE_PANEL_CLASS,
  MOBILE_IMMERSIVE_PATTERN,
  MOBILE_NAV_HIDDEN_PATTERN,
  MOBILE_NAV_SPACE_CLASS,
} from "@/lib/constants/nav";
import { GRADIENT_BURST_CLASS } from "@/lib/constants/ui";
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
  const isImmersive = MOBILE_IMMERSIVE_PATTERN.test(pathname);
  const isFramed = !hideMobileNav;

  return (
    <AppProviders>
      {isMobile ? (
        <div
          className={cn(
            "relative h-dvh w-dvw overflow-hidden flex flex-col pt-[env(safe-area-inset-top)]",
            isFramed ? "bg-sidebar" : "bg-background",
            !hideMobileNav && MOBILE_NAV_SPACE_CLASS,
            isFramed && MOBILE_FRAMED_SHELL_CLASS,
          )}
        >
          <div aria-hidden className={GRADIENT_BURST_CLASS} />
          <SpiderWeb
            corner="top-left"
            className="top-[env(safe-area-inset-top)] size-14"
          />
          {isFramed && <MobileTopBar />}
          <ImpersonationBanner />
          <AlertStack />
          <PiScanStatusBar />
          <main
            className={cn(
              "relative flex-1 min-h-0 overflow-hidden flex flex-col",
              isFramed && MOBILE_FRAMED_PANEL_CLASS,
              isImmersive && MOBILE_IMMERSIVE_PANEL_CLASS,
            )}
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
          {!hideMobileNav && <MobileNav />}
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden pb-6 flex flex-col bg-sidebar relative text-foreground/70">
          <div aria-hidden className={GRADIENT_BURST_CLASS} />
          <SpiderWeb corner="top-left" withSpider className="z-0" />
          <AppTopBar />
          <div className="relative flex flex-row flex-1 min-h-0 overflow-hidden pr-1.5">
            <AppNav />
            <main className="relative flex-1 min-w-0 overflow-hidden flex flex-col rounded-lg border bg-background/70 shadow-xs dark:bg-background/60">
              <ImpersonationBanner />
              <AlertStack />
              <PiScanStatusBar />
              <IntakeBanner />
              <PageTransition>
                <Outlet />
              </PageTransition>
            </main>
          </div>
          <ScannerPip />
          <DesktopScannerPip />
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
                <SeasonalPumpkin className="size-3.5" />
                <span className="text-foreground/70">v{__APP_VERSION__}</span>
                <EnvBanner />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppProviders>
  );
}
