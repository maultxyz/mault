import { Button } from "@/components/ui/button";
import {
  MOBILE_CIRCLE_BUTTON_CLASS,
  MOBILE_PAGE_TITLE_CLASS,
  MOBILE_PLAIN_HEADER_CLASS,
} from "@/lib/constants/nav";
import type { MobilePageHeaderProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobilePageHeader({
  title,
  subtitle,
  subtitleLeading,
  backTo,
  onBack,
  actions,
  children,
  collapsed = false,
}: MobilePageHeaderProps) {
  const { t } = useTranslation("common");
  const hasBack = !!backTo || !!onBack;
  const actionGroup = actions && (
    <div className="flex shrink-0 items-center gap-2">{actions}</div>
  );

  return (
    <header className={MOBILE_PLAIN_HEADER_CLASS}>
      {hasBack && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            className={MOBILE_CIRCLE_BUTTON_CLASS}
            aria-label={t("mobileMenu.back")}
            onClick={onBack}
            render={backTo ? <Link to={backTo} /> : undefined}
          >
            <IconChevronLeft />
          </Button>
          {actionGroup}
        </div>
      )}
      <div className="flex min-h-10 items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              MOBILE_PAGE_TITLE_CLASS,
              "line-clamp-2",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 flex items-center gap-1.5">
              {subtitleLeading}
              <p className="truncate text-xs text-foreground/70">{subtitle}</p>
            </div>
          )}
        </div>
        {!hasBack && actionGroup}
      </div>
      {children && (
        <div
          aria-hidden={collapsed || undefined}
          className={cn(
            "grid transition-[grid-template-rows,margin,opacity] duration-200 motion-reduce:transition-none",
            collapsed ? "-mt-2.5 grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
      )}
    </header>
  );
}
