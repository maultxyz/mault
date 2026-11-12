import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import type { MobileListRowProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import {
  IconArrowUpRight,
  IconCheck,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobileListRow({
  icon,
  leading,
  label,
  description,
  value,
  trailing,
  to,
  href,
  onClick,
  destructive = false,
  selected,
  disabled = false,
}: MobileListRowProps) {
  const { t } = useTranslation("common");
  const interactive = !!(to || href || onClick);
  const content = (
    <>
      {leading ??
        (icon && (
          <MobileIconBadge tone={destructive ? "destructive" : "neutral"}>
            {icon}
          </MobileIconBadge>
        ))}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate",
            destructive && "text-destructive",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="line-clamp-2 text-xs font-normal text-foreground/70">
            {description}
          </span>
        )}
      </span>
      {value != null && (
        <span className="max-w-[50%] shrink-0 truncate text-sm font-normal text-foreground/70">
          {value}
        </span>
      )}
      {trailing}
      {selected && (
        <>
          <IconCheck className="size-4 shrink-0 text-primary" />
          <span className="sr-only">{t("a11y.selected")}</span>
        </>
      )}
      {interactive && selected == null && !trailing && !destructive &&
        (href ? (
          <IconArrowUpRight className="size-4 shrink-0 text-foreground/70" />
        ) : (
          <IconChevronRight className="size-4 shrink-0 text-foreground/70" />
        ))}
    </>
  );
  const className = cn(
    MOBILE_LIST_ROW_CLASS,
    !interactive && "active:bg-transparent",
    disabled && "pointer-events-none opacity-50",
  );
  const disabledLinkProps = disabled
    ? {
        "aria-disabled": true,
        onClick: (event: React.MouseEvent) => event.preventDefault(),
      }
    : {};

  if (to) {
    return (
      <Link to={to} className={className} {...disabledLinkProps}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        {...disabledLinkProps}
      >
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
