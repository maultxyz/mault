import type { FlatbedScanFlow } from "@/lib/interfaces/scanner";
import type { TFunction } from "i18next";

export function flatbedInstruction(t: TFunction<"scanner">, flow: FlatbedScanFlow) {
  if (flow.step === "move-card") {
    return t("flatbed.instruction.moveCard", { seconds: flow.secondsLeft ?? 0 });
  }
  if (flow.step === "done" && !flow.hasSorter) {
    return t("flatbed.instruction.doneWithoutSorter");
  }
  return t(`flatbed.instruction.${flow.step}`);
}
