import { Progress } from "@/components/ui/progress";
import type { GuideProgressProps } from "@/lib/interfaces/guide";

export function GuideProgress({ label, done, total }: GuideProgressProps) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-heading text-sm font-medium tracking-widest text-foreground/70 uppercase tabular-nums">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <Progress aria-label={label} value={pct} size="sm" />
    </div>
  );
}
