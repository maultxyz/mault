import {
  DEMO_ALPHABET_BINS,
  DEMO_ALPHABET_DEEPER,
} from "@/lib/constants/landing";
import { IconArrowRight } from "@tabler/icons-react";

export function DemoAlphabetSort() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        {DEMO_ALPHABET_BINS.map((bin) => (
          <div
            key={bin.letter}
            className="flex flex-col items-center gap-0.5 rounded-lg border border-input bg-background px-2 py-1.5"
          >
            <span className="font-heading text-lg font-semibold leading-none text-primary">
              {bin.letter}
            </span>
            <span className="w-full truncate text-center text-sm text-foreground/70">
              {bin.card}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
          A
        </span>
        <IconArrowRight size={14} className="shrink-0 text-foreground/70" />
        <div className="flex flex-wrap gap-1">
          {DEMO_ALPHABET_DEEPER.map((prefix) => (
            <span
              key={prefix}
              className="rounded-full border border-input bg-background px-2 py-0.5"
            >
              {prefix}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
