import { BrandBadge } from "@/components/brand-badge";
import { NotificationsButton } from "@/components/notifications-button";
import { ValidateMatchesButton } from "@/components/validate-matches-button";
import { useOrg } from "@/features/companies/api/use-organization";

export function MobileTopBar() {
  const { activeOrg } = useOrg();

  return (
    <header className="relative flex h-11 shrink-0 items-center gap-1 px-2.5">
      <BrandBadge />
      {activeOrg && (
        <span aria-hidden className="mx-1 h-4 w-px bg-sidebar-border" />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {activeOrg && (
          <span className="truncate text-sm font-semibold">
            {activeOrg.name}
          </span>
        )}
      </div>
      <ValidateMatchesButton iconOnly />
      <NotificationsButton />
    </header>
  );
}
