import { Input } from "@/components/ui/input";
import type { MenuSearchFieldProps } from "@/lib/interfaces/menu";
import { IconSearch } from "@tabler/icons-react";

export function MenuSearchField({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  inputRef,
}: MenuSearchFieldProps) {
  return (
    <div className="relative p-1">
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground/70" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") return;
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="pl-7"
      />
    </div>
  );
}
