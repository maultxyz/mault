import type { BuildOptionCardProps } from "@/lib/interfaces/build";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

export function BuildOptionCard({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  onSelect,
}: BuildOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10"
          : "hover:border-foreground/30 hover:bg-secondary/40",
        disabled && !selected && "cursor-not-allowed opacity-50 hover:border-border hover:bg-background",
        disabled && selected && "cursor-default",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-6">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm/relaxed text-foreground/70">{description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute top-3 right-3 grid size-5 place-items-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-foreground/30",
        )}
      >
        {selected && <IconCheck size={12} stroke={3} />}
      </span>
    </button>
  );
}
