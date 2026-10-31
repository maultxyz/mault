import { Badge } from "@/components/ui/badge";
import type { PlanLockTagProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function PlanLockTag({ label, className }: PlanLockTagProps) {
  return (
    <Badge variant="outline" className={cn("shrink-0", className)}>
      {label}
    </Badge>
  );
}
