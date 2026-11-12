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
  if (adapter.controlStage === "before-identify") {
    const result = await readControl();
    if (result) return result;
  }
  let outcome = await adapter.identify(frame);
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
    if (!Object.is(revision, adapter.revision?.())) continue;
    await adapter.pick(plan);
    if (adapter.checkpoint && !(await adapter.checkpoint())) return "stopped";
    if (!Object.is(revision, adapter.revision?.())) continue;
    await adapter.route(plan);
    await adapter.persist(plan);
    await adapter.complete(plan);
    return "complete";
  }
}
