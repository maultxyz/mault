import { AlertTrayTrigger } from "@/components/alert-tray-trigger";
import { BrandIcon } from "@/components/brand-icon";
import { LanguageSwitcherIcon } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/features/account/components/user-menu";
import { PresetMenu } from "@/features/bins/components/preset-menu";
import { CollectionMenu } from "@/features/collections/components/collection-menu";
import { StationMenu } from "@/features/scanner/components/station-menu";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";
import { useTranslation } from "react-i18next";

function BreadcrumbSeparator() {
  return (
    <span aria-hidden className="shrink-0 text-foreground/30">
      /
    </span>
  );
}

export function AppTopBar() {
  const { t } = useTranslation("common");

  return (
    <header className="relative flex h-9 shrink-0 items-center gap-1 px-1.5">
      <AlertTrayTrigger
        side="bottom"
        align="start"
        trigger={(count) => (
          <button
            type="button"
            aria-label={t("alerts.tray.trigger")}
            className="relative grid size-6.5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <BrandIcon className="size-5.5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 rounded-full bg-destructive px-0.5 text-2xs font-semibold leading-3.5 text-destructive-foreground ring-2 ring-sidebar">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        )}
      />
      <span aria-hidden className="mx-1 h-4 w-px bg-sidebar-border" />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <OrgSwitcher />
        <BreadcrumbSeparator />
        <StationMenu />
        <BreadcrumbSeparator />
        <CollectionMenu />
        <BreadcrumbSeparator />
        <PresetMenu />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 **:data-[slot=button]:hover:bg-sidebar-accent **:data-[slot=button]:aria-expanded:bg-sidebar-accent">
        <LanguageSwitcherIcon />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
