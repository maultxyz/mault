import { Button } from "@/components/ui/button";
import type { JamToastBodyProps } from "@/lib/interfaces/scanner";

export function JamToastBody({
  description,
  dropLabel,
  markClearedLabel,
  onDrop,
  onMarkCleared,
}: JamToastBodyProps) {
  return (
    <div className="flex flex-col gap-2">
      <span>{description}</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDrop}>
          {dropLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          onClick={onMarkCleared}
        >
          {markClearedLabel}
        </Button>
      </div>
    </div>
  );
}
