import { MobileSearchInput } from "@/components/mobile-search-input";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { ListSearchInputProps } from "@/lib/interfaces/nav";
import { IconSearch } from "@tabler/icons-react";

export function ListSearchInput({ value, onChange, placeholder, maxLength }: ListSearchInputProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileSearchInput
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <div className="relative min-w-0 shrink-0">
      <IconSearch
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
