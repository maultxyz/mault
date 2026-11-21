import {
  isScannerControlCode,
  parseScannerControlCode,
} from "./scanner-control-code";
import type {
  ScanWorkflowAdapter,
  ScanWorkflowResult,
} from "./interfaces/scan-workflow.interface";

export async function runScanWorkflow<Frame, Outcome>(
  adapter: ScanWorkflowAdapter<Frame, Outcome>,
): Promise<ScanWorkflowResult> {
  const active = () => adapter.checkpoint?.() ?? Promise.resolve(true);
  const frame = await adapter.capture();
  if (!(await active())) return "stopped";
  const readControl = async (): Promise<ScanWorkflowResult | null> => {
    const text = await adapter.readControl(frame);
    if (!(await active())) return "stopped";
    if (!text) return null;
    if (!isScannerControlCode(text))
      return (await adapter.applyOtherCode?.(text)) ? "control" : null;
    await adapter.applyControl(parseScannerControlCode(text));
    return "control";
  };
  const early: {
    routed: { outcome: Outcome } | null;
    held: { outcome: Outcome } | null;
    isControlPending: boolean;
    isIdentified: boolean;
  } = {
    routed: null,
    held: null,
    isControlPending: adapter.controlStage === "during-identify",
    isIdentified: false,
  };
  const routeEarly = (provisional: Outcome) => {
    if (early.routed || early.isIdentified || !adapter.routeEarly) return;
    if (adapter.isRemoval()) return;
    const card = adapter.card(provisional);
    if (!card || adapter.isDuplicate(card)) return;
    if (adapter.routeEarly(provisional)) early.routed = { outcome: provisional };
  };
  const identify = async (): Promise<Outcome> => {
    try {
      const identified = await adapter.identify(frame, (provisional) => {
        if (early.isControlPending) early.held = { outcome: provisional };
        else routeEarly(provisional);
      });
      return early.routed && !adapter.card(identified)
        ? early.routed.outcome
        : identified;
    } catch (error) {
      if (!early.routed) throw error;
      return early.routed.outcome;
    } finally {
      early.isIdentified = true;
    }
  };
  let outcome: Outcome;
  if (adapter.controlStage === "during-identify") {
    const identifying = identify();
    identifying.catch(() => undefined);
    const result = await readControl();
    if (result) return result;
    early.isControlPending = false;
    if (early.held) routeEarly(early.held.outcome);
    outcome = await identifying;
  } else {
    if (adapter.controlStage === "before-identify") {
      const result = await readControl();
      if (result) return result;
    }
    outcome = await identify();
  }
  if (early.routed) {
    await adapter.matched(outcome);
    return "matched";
  }
  if (!(await active())) return "stopped";
  const card = adapter.card(outcome);
  if (!card && adapter.controlStage === "after-miss") {
    const result = await readControl();
    if (result) return result;
  }
  if (adapter.isRemoval()) {
    await adapter.remove(outcome);
    return "removal";
  }
  if (!card) {
    await adapter.unmatched(outcome);
    return "unmatched";
  }
  if (adapter.isDuplicate(card)) {
    await adapter.duplicate(outcome);
    return "duplicate";
  }
  if (adapter.refineFoil) {
    outcome = await adapter.refineFoil(outcome);
    if (!(await active())) return "stopped";
  }
  await adapter.matched(outcome);
  return "matched";
}

export async function runScanDisposition<
  Plan extends { action: "pause" | "route" },
>(
  adapter: import("./interfaces/scan-workflow.interface").ScanDispositionAdapter<Plan>,
): Promise<"complete" | "stopped"> {
  while (true) {
    if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
    const revision = adapter.revision?.();
    const plan = adapter.prepare();
    if (plan.action === "pause") {
      if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
      if (!Object.is(revision, adapter.revision?.())) continue;
      if (!(await adapter.hold(plan))) return "stopped";
      continue;
    }
    if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
    if (!Object.is(revision, adapter.revision?.())) continue;
    await adapter.assign(plan);
    if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
    await adapter.pick(plan);
    if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
    await adapter.route(plan);
    await adapter.persist(plan);
    await adapter.complete(plan);
    return "complete";
  }
}
