import { BrandBadge } from "@/components/brand-badge";
import { NotificationsButton } from "@/components/notifications-button";
import { ValidateMatchesPopover } from "@/components/validate-matches-popover";
import { MATCH_VALIDATIONS_ENABLED } from "@/lib/constants/match-validations";
import { UserMenu } from "@/features/account/components/user-menu";
import { FeatureHighlightsButton } from "@/features/feature-highlights/components/feature-highlights-button";
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
      {MATCH_VALIDATIONS_ENABLED && (
        <div className="ml-auto flex shrink-0 items-center pr-1">
          <ValidateMatchesPopover />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-0.5 **:data-[slot=button]:hover:bg-sidebar-accent **:data-[slot=button]:aria-expanded:bg-sidebar-accent">
        <FeatureHighlightsButton />
        <NotificationsButton />
        <UserMenu />
      </div>
    </header>
  );
}
