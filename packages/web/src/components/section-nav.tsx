import { buttonVariants } from "@/components/ui/button";
import type { SectionNavProps } from "@/lib/interfaces/nav";
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
        "flex items-center gap-2 p-2 border-b bg-sidebar/70 overflow-x-auto shrink-0",
        "lg:flex-col lg:items-stretch lg:min-h-0 lg:h-full lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r",
        className,
      )}
      data-tour={dataTour}
    >
      <div className="px-1.5 shrink-0 lg:pt-1 lg:pb-2">
        <h1 className="text-lg font-semibold font-heading whitespace-nowrap">
          {title}
        </h1>
        <p className="hidden lg:block text-xs text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
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
