import type { GuideProgressProps } from "@/lib/interfaces/guide";

export function GuideProgress({ label, done, total }: GuideProgressProps) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase tabular-nums">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1 overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
