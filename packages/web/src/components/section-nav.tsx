import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import type { SectionNavProps } from "@/lib/interfaces/nav";
import { sidebarItemClassName } from "@/lib/sidebar-item";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";

export function SectionNav({
  title,
  subtitle,
  items,
  className,
  "data-tour": dataTour,
}: SectionNavProps) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1 p-2 border-b bg-sidebar/70 overflow-x-auto shrink-0",
        "lg:flex-col lg:gap-0.5 lg:items-stretch lg:min-h-0 lg:h-full lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r",
        className,
      )}
      data-tour={dataTour}
    >
      <div className="px-1.5 shrink-0 lg:pt-1 lg:pb-2">
        <h1 className={cn(PAGE_TITLE_CLASS, "whitespace-nowrap")}>
          {title}
        </h1>
        <p className="hidden lg:block text-xs text-foreground/70">
          {subtitle}
        </p>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              sidebarItemClassName({ isActive }),
              "shrink-0 justify-start gap-2 px-2.5 border-0 lg:w-full",
            )
          }
        >
          {item.icon}
          <span className="whitespace-nowrap lg:truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
