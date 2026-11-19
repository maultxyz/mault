import { CommandItem } from "@/components/ui/command";
import type { GlobalSearchResultItemProps } from "@/lib/interfaces/search";

export function GlobalSearchResultItem({ value, title, subtitle, leading, onSelect }: GlobalSearchResultItemProps) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-foreground/70">{subtitle}</span>}
      </span>
    </CommandItem>
  );
}
