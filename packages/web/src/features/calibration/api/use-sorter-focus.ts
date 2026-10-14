import type { ServoName, SliderKey } from "@/lib/interfaces/calibration";
import type {
  SorterFocus,
  SorterServoTargets,
} from "@/lib/interfaces/sorter-model";
import { useEffect, useRef, useState } from "react";

export function useSorterFocus(targets: SorterServoTargets) {
  const previous = useRef<SorterServoTargets | null>(null);
  const [focus, setFocus] = useState<SorterFocus | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = targets;
    if (!before) return;
    const changed = (Object.keys(targets) as SliderKey[]).filter(
      (key) =>
        targets[key].angles.join() !== (before[key]?.angles.join() ?? ""),
    );
    const key = changed.at(-1);
    if (!key) return;
    const [module, servo] = key.split(":");
    setFocus({ module: Number(module), servo: servo as ServoName });
  }, [targets]);

  return [focus, setFocus] as const;
}
