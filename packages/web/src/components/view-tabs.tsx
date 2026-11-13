import { useTabListKeyboard } from "@/hooks/use-tab-list-keyboard";
import type { ViewTabsProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function ViewTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  fill = false,
  className,
}: ViewTabsProps<T>) {
  const { onKeyDown, tabIndexFor } = useTabListKeyboard(
    items.map((item) => item.key),
    value,
    onChange,
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex items-end gap-4 border-b max-md:gap-6", className)}
    >
      {items.map((item, index) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={tabIndexFor(index)}
            onKeyDown={onKeyDown}
            onClick={() => onChange(item.key)}
            className={cn(
              "-mb-px flex h-7 max-md:h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-0.5 text-control font-medium whitespace-nowrap transition-colors rounded-t-sm outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              fill && "flex-1",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-foreground/70 hover:border-border hover:text-foreground",
            )}
          >
            <span className="truncate">{item.label}</span>
            {!!item.badge && (
              <span className="min-w-4 rounded-sm bg-destructive-strong px-1 text-2xs leading-4 font-semibold text-white tabular-nums">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
