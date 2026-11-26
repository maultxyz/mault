import { DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import type { ScanOptionsSubmenuTriggerProps } from "@/lib/interfaces/scanner";

export function ScanOptionsSubmenuTrigger({
  icon,
  label,
  value,
}: ScanOptionsSubmenuTriggerProps) {
  return (
    <DropdownMenuSubTrigger className="min-w-52">
      {icon}
      <span>{label}</span>
      <span className="ml-auto max-w-32 truncate pl-4 text-xs text-foreground/70">
        {value}
      </span>
    </DropdownMenuSubTrigger>
  );
}
