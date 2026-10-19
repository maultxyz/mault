import type { PiScanSessionState } from "@magic-vault/shared";

export function piScanElapsedMs(state: PiScanSessionState, now: number): number {
  if (!state.startedAt) return 0;
  const start = Date.parse(state.startedAt);
  if (!Number.isFinite(start)) return 0;
  let paused = state.pausedMs;
  if (state.pausedAt) {
    const held = Date.parse(state.pausedAt);
    if (Number.isFinite(held)) paused += Math.max(0, now - held);
  }
  return Math.max(0, now - start - paused);
}

type Translate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

function cardText(t: Translate, sight: PiScanSessionState["lastCard"]) {
  if (!sight || sight.binNumber == null) return null;
  if (sight.matched && sight.name) {
    return t("piScan.lastCard", { name: sight.name, bin: sight.binNumber });
  }
  return t("piScan.lastUnmatched", { bin: sight.binNumber });
}

export function piScanStatusText(
  t: Translate,
  state: PiScanSessionState,
): string {
  if (state.stopping) return t("piScan.stopping");
  if (state.phase === "paused") {
    const last = cardText(t, state.lastCard);
    return last ? `${t("piScan.paused")} · ${last}` : t("piScan.paused");
  }
  if (state.activity === "feeding") return t("piScan.feeding");
  if (state.activity === "matching") return t("piScan.matching");
  if (state.activity === "routing" && state.current?.binNumber != null) {
    if (state.current.matched && state.current.name) {
      return t("piScan.routing", {
        name: state.current.name,
        bin: state.current.binNumber,
      });
    }
    return t("piScan.routingUnmatched", { bin: state.current.binNumber });
  }
  return cardText(t, state.lastCard) ?? t("piScan.scanning");
}
