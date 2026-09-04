import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

const PAGES = [
  { key: "home", to: "/" },
  { key: "build", to: "/build" },
  { key: "discordBot", to: "/discord-bot" },
] as const;

export function PublicNav({
  containerClassName = "max-w-6xl",
}: {
  containerClassName?: string;
}) {
  const { t } = useTranslation("common");
  const { data, isPending } = useAuthSession();
  const isSignedIn = !isPending && !!data?.user;
  const location = useLocation();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div
        className={cn(
          "mx-auto flex h-14 items-center justify-between px-4",
          containerClassName,
        )}
      >
        <div className="flex items-center gap-6">
          <BrandMark />
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label={t("publicNav.pagesAria")}
          >
            {PAGES.map((page) => {
              const active = location.pathname === page.to;
              return (
                <Link
                  key={page.key}
                  to={page.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    active ? "text-foreground" : "text-foreground/70",
                  )}
                >
                  {t(`publicNav.pages.${page.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("publicNav.discordAriaLabel")}
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              {t("publicNav.openApp")}
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
                {t("publicNav.signIn")}
              </Link>
              <Link
                to="/auth/sign-up"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                {t("publicNav.getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
