import { BrandAlertTrigger } from "@/components/brand-alert-trigger";
import { CollectionMenu } from "@/features/collections/components/collection-menu";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";

export function MobileTopBar() {
  return (
    <header className="relative flex h-11 shrink-0 items-center gap-1 px-2.5">
      <BrandAlertTrigger />
      <span aria-hidden className="mx-1 h-4 w-px bg-sidebar-border" />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <OrgSwitcher />
        <span aria-hidden className="shrink-0 text-foreground/30">
          /
        </span>
        <CollectionMenu />
      </div>
    </header>
  );
}
