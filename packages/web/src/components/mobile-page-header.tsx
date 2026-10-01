import { Button } from "@/components/ui/button";
import type { MobilePageHeaderProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobilePageHeader({
  title,
  subtitle,
  backTo,
  actions,
}: MobilePageHeaderProps) {
  const { t } = useTranslation("common");

  return (
    <header className="flex min-h-14 shrink-0 items-center gap-1 border-b bg-sidebar px-2 py-2">
      {backTo && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("mobileMenu.back")}
          render={<Link to={backTo} />}
        >
          <IconChevronLeft />
        </Button>
      )}
      <div className={cn("min-w-0 flex-1", !backTo && "pl-2")}>
        <h1 className="truncate font-heading text-base font-semibold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-foreground/70">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </header>
  );
}
