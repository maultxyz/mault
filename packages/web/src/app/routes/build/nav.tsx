import { BrandMark } from "@/components/brand-mark";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const navLinkClass =
  "relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";
const drawerLinkClass =
  "rounded-md px-3 py-2.5 text-foreground transition-colors hover:bg-muted";

export function BuildNav() {
  const { t } = useTranslation("build");
  const { data, isPending } = useAuthSession();
  const isSignedIn = !isPending && !!data?.user;

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <BrandMark />

        <nav className="hidden items-center gap-6 text-xs/relaxed font-medium text-muted-foreground md:flex">
          <a href="#parts" className={navLinkClass}>
            {t("nav.partsList")}
          </a>
          <a href="#wiring" className={navLinkClass}>
            {t("nav.wiring")}
          </a>
          <a href="#assembly" className={navLinkClass}>
            {t("nav.assembly")}
          </a>
          <a
            href="https://github.com/dishwasher-detergent/mault/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClass}
          >
            {t("nav.reportIssue")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.joinDiscordAria")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          <MobileNavDrawer label={t("nav.menuAria")}>
            <a href="#parts" className={drawerLinkClass}>
              {t("nav.partsList")}
            </a>
            <a href="#wiring" className={drawerLinkClass}>
              {t("nav.wiring")}
            </a>
            <a href="#assembly" className={drawerLinkClass}>
              {t("nav.assembly")}
            </a>
            <a
              href="https://github.com/dishwasher-detergent/mault/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className={drawerLinkClass}
            >
              {t("nav.reportIssue")}
            </a>
          </MobileNavDrawer>
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              {t("nav.openApp")}
            </Link>
          ) : (
            <Link
              to="/auth/sign-up"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "shadow-sm shadow-primary/30 transition-shadow hover:shadow-md hover:shadow-primary/30",
              )}
            >
              {t("nav.getStarted")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
