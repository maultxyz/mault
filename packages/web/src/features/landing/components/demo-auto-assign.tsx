import { IconArrowRight } from "@tabler/icons-react";

const ROWS = [
  { value: "Mythic", bin: 1 },
  { value: "Rare", bin: 2 },
  { value: "Uncommon", bin: 3 },
  { value: "Common", bin: 4 },
];

export function DemoAutoAssign() {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {ROWS.map((r) => (
        <div
          key={r.value}
          className="flex items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
        >
          <span>{r.value}</span>
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <IconArrowRight size={12} />
            Bin {r.bin}
          </span>
        </div>
      ))}
    </div>
  );
}
