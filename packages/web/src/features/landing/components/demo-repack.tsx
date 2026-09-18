import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

const SLOTS = [
  { label: "Bin 1", note: "3 commons", done: 3, total: 3 },
  { label: "Bin 2", note: "2 uncommons", done: 1, total: 2 },
  { label: "Bin 3", note: "1 rare", done: 0, total: 1 },
];

export function DemoRepack() {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {SLOTS.map((s) => {
        const complete = s.done >= s.total;
        return (
          <div key={s.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="flex items-center gap-1 text-foreground/70">
                {complete && <IconCheck size={12} className="text-primary" />}
                {s.done}/{s.total} {s.note}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  complete ? "bg-primary" : "bg-primary/60",
                )}
                style={{ width: `${(s.done / s.total) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
