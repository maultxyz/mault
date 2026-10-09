import type { BarListProps, BarListRowProps } from "@/lib/interfaces/stats";

function BarListRow({ item, max }: BarListRowProps) {
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          {item.swatch && (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full border border-border/50"
              style={{ backgroundColor: item.swatch }}
            />
          )}
          <span className="truncate">{item.label}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
          {item.display}
          {item.secondary && (
            <span className="ml-1.5 text-xs font-normal text-foreground/70">
              {item.secondary}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary dark:bg-sidebar-primary"
          style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
        />
      </div>
    </>
  );

  if (item.onSelect) {
    return (
      <li>
        <button
          type="button"
          onClick={item.onSelect}
          className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted active:bg-muted"
        >
          {content}
        </button>
      </li>
    );
  }
  return <li className="flex flex-col gap-1.5 py-1.5">{content}</li>;
}

export function BarList({ items, emptyLabel }: BarListProps) {
  const max = Math.max(...items.map((item) => item.value), 0);

  if (items.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-foreground/70">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <BarListRow key={item.key} item={item} max={max} />
      ))}
    </ul>
  );
}
