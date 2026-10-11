import { IconArrowRight } from "@tabler/icons-react";
import { DEMO_AUTO_ASSIGN_ROWS } from "@/lib/constants/landing";

export function DemoAutoAssign() {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {DEMO_AUTO_ASSIGN_ROWS.map((r) => (
        <div
          key={r.value}
          className="flex items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <span>{r.value}</span>
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            <IconArrowRight size={12} />
            Bin {r.bin}
          </span>
        </div>
      ))}
    </div>
  );
}
