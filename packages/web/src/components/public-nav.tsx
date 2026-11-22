import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuthSession } from "@/lib/auth";
import { DISCORD_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import { IconBrandDiscord, IconMenu2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SkipLink } from "@/components/skip-link";
import { Link } from "react-router-dom";
import {
  DesktopPublicNavLinks,
  DrawerPublicNavLinks,
} from "@/components/public-nav-links";

export function PublicNav() {
  const { t } = useTranslation("common");
  const { data, isPending } = useAuthSession();
  const isSignedIn = !isPending && !!data?.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <SkipLink />
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <BrandMark className="color-primary" />
          <DesktopPublicNavLinks />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("publicNav.discordAriaLabel")}
            className="hidden text-foreground/70 transition-colors hover:text-foreground md:block"
          >
            <IconBrandDiscord size={18} />
          </a>
          <ThemeToggle />
          <span
            className="mx-1 hidden h-4 w-px bg-border md:block"
            aria-hidden
          />
          {isSignedIn ? (
            <Link
              to="/app"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "hidden md:inline-flex",
              )}
            >
              {t("publicNav.openApp")}
            </Link>
          ) : (
            <>
              <Link
                to="/auth/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "hidden md:inline-flex",
                )}
              >
                {t("publicNav.signIn")}
              </Link>
              <Link
                to="/auth/sign-up"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "hidden md:inline-flex",
                )}
              >
                {t("publicNav.getStarted")}
              </Link>
            </>
          )}

          <Drawer direction="right" open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                aria-label={t("publicNav.menuAriaLabel")}
                className="grid size-9 shrink-0 place-items-center rounded-md text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground md:hidden"
              >
                <IconMenu2 size={20} />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="sr-only">
                <DrawerTitle>{t("publicNav.menuAriaLabel")}</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-1 p-2">
                <DrawerPublicNavLinks onNavigate={closeMenu} />
                <div className="my-1 h-px bg-border" aria-hidden />
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground"
                >
                  <IconBrandDiscord size={16} />
                  {t("publicNav.discordAriaLabel")}
                </a>
                {isSignedIn ? (
                  <Link
                    to="/app"
                    onClick={closeMenu}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "mt-2",
                    )}
                  >
                    {t("publicNav.openApp")}
                  </Link>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <Link
                      to="/auth/sign-in"
                      onClick={closeMenu}
                      className={cn(buttonVariants({ variant: "outline" }))}
                    >
                      {t("publicNav.signIn")}
                    </Link>
                    <Link
                      to="/auth/sign-up"
                      onClick={closeMenu}
                      className={cn(buttonVariants({ variant: "default" }))}
                    >
                      {t("publicNav.getStarted")}
                    </Link>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
