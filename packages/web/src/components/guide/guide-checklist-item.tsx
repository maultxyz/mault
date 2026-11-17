import { Checkbox } from "@/components/ui/checkbox";
import type { GuideChecklistItemProps } from "@/lib/interfaces/guide";
import { cn } from "@/lib/utils";

export function GuideChecklistItem({
  id,
  checked,
  onToggle,
  number,
  children,
  details,
  aside,
  className,
}: GuideChecklistItemProps) {
  return (
    <div className={cn("group/anchor flex gap-2.5", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="flex cursor-pointer items-baseline gap-2.5"
        >
          {number && (
            <span className="font-heading text-2xs font-semibold text-primary tabular-nums">
              {number}
            </span>
          )}
          <span
            className={cn(
              "text-sm/relaxed",
              checked &&
                "text-foreground/70 line-through decoration-foreground/70",
            )}
          >
            {children}
          </span>
        </label>
        {details}
      </div>
      {aside}
    </div>
  );
}
