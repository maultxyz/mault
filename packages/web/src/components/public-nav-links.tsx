import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  PUBLIC_NAV_DRAWER_LINK_CLASS,
  PUBLIC_NAV_VISIBLE_ENTRIES,
  PUBLIC_NAV_FEATURED_LINK_CLASS,
  PUBLIC_NAV_MENU_LINK_CLASS,
  PUBLIC_NAV_MENU_TRIGGER_CLASS,
} from "@/lib/constants/nav";
import type {
  PublicNavLinkItemProps,
  PublicNavLinksProps,
  PublicNavMenuLinkProps,
} from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

function linkClassName(baseClassName: string, active: boolean): string {
  return cn(baseClassName, active ? "text-foreground" : "text-foreground/70");
}

function NavLinkItem({ link, baseClassName, onNavigate }: PublicNavLinkItemProps) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const label = t(`publicNav.pages.${link.key}`);

  if (link.external) {
    return (
      <a
        href={link.to}
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
        className={cn(linkClassName(baseClassName, false), "flex items-center gap-1.5")}
      >
        {label}
        <IconExternalLink aria-hidden className="size-3.5 text-foreground/70" />
        <span className="sr-only">{t("publicNav.opensInNewTab")}</span>
      </a>
    );
  }
  const active = pathname === link.to;
  return (
    <Link
      to={link.to}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        linkClassName(baseClassName, active),
        link.isFeatured && PUBLIC_NAV_FEATURED_LINK_CLASS,
      )}
    >
      {label}
    </Link>
  );
}

function NavigationMenuPageLink({
  link,
  className,
}: PublicNavMenuLinkProps) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const label = t(`publicNav.pages.${link.key}`);

  if (link.external) {
    return (
      <NavigationMenuLink
        href={link.to}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {label}
        <IconExternalLink aria-hidden className="size-3.5 text-foreground/70" />
        <span className="sr-only">{t("publicNav.opensInNewTab")}</span>
      </NavigationMenuLink>
    );
  }
  return (
    <NavigationMenuLink
      active={pathname === link.to}
      className={cn(className, link.isFeatured && PUBLIC_NAV_FEATURED_LINK_CLASS)}
      render={<Link to={link.to} />}
    >
      {label}
    </NavigationMenuLink>
  );
}

export function DesktopPublicNavLinks() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();

  return (
    <NavigationMenu
      aria-label={t("publicNav.pagesAria")}
      className="hidden md:flex"
    >
      <NavigationMenuList className="gap-1">
        {PUBLIC_NAV_VISIBLE_ENTRIES.map((entry) => (
          <NavigationMenuItem key={entry.key}>
            {entry.kind === "link" ? (
              <NavigationMenuPageLink
                link={entry}
                className={cn(
                  navigationMenuTriggerStyle(),
                  PUBLIC_NAV_MENU_TRIGGER_CLASS,
                )}
              />
            ) : (
              <>
                <NavigationMenuTrigger
                  className={cn(
                    PUBLIC_NAV_MENU_TRIGGER_CLASS,
                    entry.links.some(
                      (link) => !link.external && link.to === pathname,
                    ) && "text-foreground",
                  )}
                >
                  {t(`publicNav.groups.${entry.key}`)}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="flex w-52 flex-col">
                    {entry.links.map((link) => (
                      <li key={link.key}>
                        <NavigationMenuPageLink
                          link={link}
                          className={PUBLIC_NAV_MENU_LINK_CLASS}
                        />
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function DrawerPublicNavLinks({ onNavigate }: PublicNavLinksProps) {
  const { t } = useTranslation("common");

  return (
    <nav className="flex flex-col gap-2" aria-label={t("publicNav.pagesAria")}>
      {PUBLIC_NAV_VISIBLE_ENTRIES.map((entry) =>
        entry.kind === "link" ? (
          <NavLinkItem
            key={entry.key}
            link={entry}
            baseClassName={PUBLIC_NAV_DRAWER_LINK_CLASS}
            onNavigate={onNavigate}
          />
        ) : (
          <div
            key={entry.key}
            role="group"
            aria-labelledby={`public-nav-group-${entry.key}`}
            className="flex flex-col"
          >
            <span
              id={`public-nav-group-${entry.key}`}
              className="px-3 pt-1 pb-0.5 text-sm font-semibold text-foreground/70"
            >
              {t(`publicNav.groups.${entry.key}`)}
            </span>
            {entry.links.map((link) => (
              <NavLinkItem
                key={link.key}
                link={link}
                baseClassName={PUBLIC_NAV_DRAWER_LINK_CLASS}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ),
      )}
    </nav>
  );
}
