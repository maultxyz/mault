import { Button } from "@/components/ui/button";
import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import type { PageHeaderProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  actions,
  tabs,
  children,
}: PageHeaderProps) {
  const { t } = useTranslation("common");
  const backButtonLabel = backLabel ?? t("mobileMenu.back");
  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b bg-background/80 backdrop-blur-2xl",
        !tabs && "pb-2.5",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-2.5 md:px-5 md:pt-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {backTo && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={backButtonLabel}
                title={backButtonLabel}
                nativeButton={false}
                render={<Link to={backTo} />}
              >
                <IconArrowLeft />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
              {description && (
                <p className="text-xs text-foreground/70">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        {children}
        {tabs}
      </div>
    </div>
  );
}
