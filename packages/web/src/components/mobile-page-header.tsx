import { Button } from "@/components/ui/button";
import {
  MOBILE_HEADER_BODY_CLASS,
  MOBILE_HEADER_BUTTON_CLASS,
  MOBILE_HEADER_CLASS,
  MOBILE_HEADER_FADE_CLASS,
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
  backTo,
  actions,
  children,
  variant = "plain",
}: MobilePageHeaderProps) {
  const { t } = useTranslation("common");
  const brand = variant === "brand";

  const body = (
    <>
      <div className="flex min-h-9 items-center gap-1">
        {backTo && (
          <Button
            variant="ghost"
            size="icon-lg"
            className={brand ? MOBILE_HEADER_BUTTON_CLASS : "-ml-2"}
            aria-label={t("mobileMenu.back")}
            render={<Link to={backTo} />}
          >
            <IconChevronLeft />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-lg leading-tight font-semibold">
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "truncate text-xs",
                brand ? "text-primary-foreground/80" : "text-foreground/70",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        )}
      </div>
      {children}
    </>
  );

  if (!brand) {
    return <header className={MOBILE_PLAIN_HEADER_CLASS}>{body}</header>;
  }

  return (
    <header className={MOBILE_HEADER_CLASS}>
      <div className={MOBILE_HEADER_BODY_CLASS}>{body}</div>
      <div aria-hidden className={MOBILE_HEADER_FADE_CLASS} />
    </header>
  );
}
