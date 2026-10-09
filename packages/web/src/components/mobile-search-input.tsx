import { Input } from "@/components/ui/input";
import { MOBILE_SEARCH_INPUT_CLASS } from "@/lib/constants/nav";
import type { MobileSearchInputProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";

export function MobileSearchInput({
  className,
  ...props
}: MobileSearchInputProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/70" />
      <Input
        type="search"
        className={cn(MOBILE_SEARCH_INPUT_CLASS, className)}
        {...props}
      />
    </div>
  );
}
