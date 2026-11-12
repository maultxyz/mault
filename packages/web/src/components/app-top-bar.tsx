import { BrandBadge } from "@/components/brand-badge";
import { LanguageSwitcherIcon } from "@/components/language-switcher";
import { MatchValidationProgress } from "@/components/match-validation-progress";
import { NotificationsButton } from "@/components/notifications-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ValidateMatchesButton } from "@/components/validate-matches-button";
import { UserMenu } from "@/features/account/components/user-menu";
import { PresetMenu } from "@/features/bins/components/preset-menu";
import { CollectionMenu } from "@/features/collections/components/collection-menu";
import { StationAttentionButton } from "@/features/scanner/components/station-attention-button";
import { StationMenu } from "@/features/scanner/components/station-menu";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";
import { useDesktopTitleBar } from "@/hooks/use-desktop-title-bar";
import { DESKTOP_TITLE_BAR_CLASS } from "@/lib/constants/ui";
import { cn } from "@/lib/utils";

function BreadcrumbSeparator() {
  return (
    <span aria-hidden className="shrink-0 text-foreground/30">
      /
    </span>
  );
}

export function AppTopBar() {
  const isDesktopTitleBar = useDesktopTitleBar();
  return (
    <header
      className={cn(
        "relative flex h-9 shrink-0 items-center gap-1 px-1.5",
        isDesktopTitleBar && DESKTOP_TITLE_BAR_CLASS,
      )}
    >
      <BrandBadge />
      <div className="ml-8.25 flex min-w-0 flex-1 items-center gap-1">
        <OrgSwitcher />
        <BreadcrumbSeparator />
        <StationMenu />
        <StationAttentionButton />
        <BreadcrumbSeparator />
        <CollectionMenu />
        <BreadcrumbSeparator />
        <PresetMenu />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1">
        <MatchValidationProgress className="w-28" />
        <ValidateMatchesButton />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 **:data-[slot=button]:hover:bg-sidebar-accent **:data-[slot=button]:aria-expanded:bg-sidebar-accent">
        <LanguageSwitcherIcon />
        <ThemeToggle />
        <NotificationsButton />
        <UserMenu />
      </div>
    </header>
  );
}
