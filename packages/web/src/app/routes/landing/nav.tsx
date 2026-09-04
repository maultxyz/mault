import { BrandMark } from "@/components/brand-mark";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useAuthSession } from "@/lib/auth";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const navLinkClass = "transition-colors hover:text-foreground";
const drawerLinkClass =
  "rounded-md px-3 py-2.5 text-foreground transition-colors hover:bg-muted";

export function LandingNav() {
  const { t } = useTranslation("landing");
  const { data, isPending } = useAuthSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <BrandMark />

        <nav className="hidden items-center gap-6 text-xs/relaxed font-medium text-muted-foreground md:flex">
          <a href="#features" className={navLinkClass}>
            {t("nav.features")}
          </a>
          <a href="#how-it-works" className={navLinkClass}>
            {t("nav.howItWorks")}
          </a>
          <a href="#open-source" className={navLinkClass}>
            {t("nav.openSource")}
          </a>
          {AUTH_PROVIDER !== "local" && (
            <a href="#pricing" className={navLinkClass}>
              {t("nav.pricing")}
            </a>
          )}
          <Link to="/build" className={navLinkClass}>
            {t("nav.build")}
          </Link>
          <Link to="/discord-bot" className={navLinkClass}>
            {t("nav.discordBot")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.discordAriaLabel")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          <MobileNavDrawer label={t("nav.menuAria")}>
            <a href="#features" className={drawerLinkClass}>
              {t("nav.features")}
            </a>
            <a href="#how-it-works" className={drawerLinkClass}>
              {t("nav.howItWorks")}
            </a>
            <a href="#open-source" className={drawerLinkClass}>
              {t("nav.openSource")}
            </a>
            {AUTH_PROVIDER !== "local" && (
              <a href="#pricing" className={drawerLinkClass}>
                {t("nav.pricing")}
              </a>
            )}
            <Link to="/build" className={drawerLinkClass}>
              {t("nav.build")}
            </Link>
            <Link to="/discord-bot" className={drawerLinkClass}>
              {t("nav.discordBot")}
            </Link>
          </MobileNavDrawer>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              {t("nav.openApp")}
            </Link>
          ) : (
            <>
              <Link
                to="/auth/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "hidden sm:inline-flex",
                )}
              >
                {t("nav.signIn")}
              </Link>
              <Link
                to="/auth/sign-up"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                {t("nav.getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
