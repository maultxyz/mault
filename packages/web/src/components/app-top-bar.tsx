import { BrandAlertTrigger } from "@/components/brand-alert-trigger";
import { LanguageSwitcherIcon } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/features/account/components/user-menu";
import { PresetMenu } from "@/features/bins/components/preset-menu";
import { CollectionMenu } from "@/features/collections/components/collection-menu";
import { StationMenu } from "@/features/scanner/components/station-menu";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";

function BreadcrumbSeparator() {
  return (
    <span aria-hidden className="shrink-0 text-foreground/30">
      /
    </span>
  );
}

export function AppTopBar() {
  return (
    <header className="relative flex h-9 shrink-0 items-center gap-1 px-1.5">
      <BrandAlertTrigger />
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
