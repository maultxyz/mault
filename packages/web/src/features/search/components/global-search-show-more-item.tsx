import { CommandItem } from "@/components/ui/command";
import type { GlobalSearchShowMoreItemProps } from "@/lib/interfaces/search";
import { IconChevronDown, IconLoader2 } from "@tabler/icons-react";

export function GlobalSearchShowMoreItem({ value, label, isLoading, onSelect }: GlobalSearchShowMoreItemProps) {
  return (
    <CommandItem
      value={value}
      onSelect={() => {
        if (!isLoading) onSelect();
      }}
      aria-busy={isLoading}
      className="text-foreground/70"
    >
      <span className="flex size-8 shrink-0 items-center justify-center md:size-7" aria-hidden="true">
        {isLoading ? (
          <IconLoader2 className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <IconChevronDown className="size-4" />
        )}
      </span>
      <span className="font-medium">{label}</span>
    </CommandItem>
  );
}
