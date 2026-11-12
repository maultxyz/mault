import { runScanWorkflow } from "@magic-vault/shared";
import type { PiScanLive, PiScanWorkflowPorts } from "../interfaces/pi-scan";

export function runPiScanCardWorkflow(
  session: PiScanLive,
  ports: PiScanWorkflowPorts,
) {
  return runScanWorkflow({
    controlStage: "before-identify",
    capture: ports.capture,
    readControl: ports.readControl,
    applyControl: ports.applyControl,
    identify: ports.identify,
    card: (outcome) => outcome.card,
    isRemoval: () => session.removalEnabled,
    remove: ports.removal,
    isDuplicate: (card) =>
      !session.allowDuplicates && session.lastCardId === card.id,
    duplicate: async (outcome) => {
      ports.holdDuplicate();
      if (await ports.checkpoint()) {
        const detection = await ports.nudge(outcome);
        if (detection) outcome.matched.foilDetection = detection;
        if (await ports.checkpoint()) await ports.matched(outcome);
      }
    },
    refineFoil: async (outcome) => {
      if (outcome.card) {
        const detection = await ports.nudge(outcome);
        if (detection) outcome.matched.foilDetection = detection;
      }
      return outcome;
    },
    matched: ports.matched,
    unmatched: ports.unmatched,
    checkpoint: ports.checkpoint,
  });
}
