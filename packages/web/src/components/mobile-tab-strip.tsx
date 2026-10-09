import type { MobileTabStripProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function MobileTabStrip<T extends string>({
  items,
  value,
  onChange,
  label,
}: MobileTabStripProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex shrink-0 gap-6 overflow-x-auto border-b px-5"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex h-11 shrink-0 items-center gap-1.5 text-sm transition-colors",
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary dark:after:bg-sidebar-primary"
                : "text-foreground/70",
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className="min-w-4 rounded-full bg-destructive-strong px-1 text-2xs leading-4 font-semibold text-white tabular-nums">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
