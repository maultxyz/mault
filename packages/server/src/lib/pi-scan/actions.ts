import type {
  PiLinkScanAction,
  PiLinkScanActionResult,
  PiScanRemovalAction,
  PiScanSessionSettingsBody,
  PiScanSessionStartBody,
  PiScanSessionState,
} from "@magic-vault/shared";
import { PI_SCAN_REMOVAL_ACTIONS } from "../constants/pi-scan";
import type { PiScanActionActor } from "../interfaces/pi-scan";
import { piUpdateRunning } from "../pi-update";
import {
  emergencyStopPiScanSession,
  getPiScanSession,
  pausePiScanSession,
  requestPiScanFeed,
  resetPiScanSessionStats,
  resumePiScanSession,
  startPiScanSession,
  stopPiScanSession,
  updatePiScanRemoval,
  updatePiScanSettings,
} from "./session";

function succeeded(state: PiScanSessionState): PiLinkScanActionResult {
  return { status: 200, body: { success: true, data: state } };
}

function refused(state: PiScanSessionState | null, message: string): PiLinkScanActionResult {
  return state ? succeeded(state) : { status: 409, body: { success: false, message } };
}

function isRemovalAction(body: unknown): body is PiScanRemovalAction {
  const action = (body as { action?: unknown } | null)?.action;
  return PI_SCAN_REMOVAL_ACTIONS.includes(action as PiScanRemovalAction["action"]);
}

export async function runPiScanAction(
  actor: PiScanActionActor,
  action: PiLinkScanAction,
  body: unknown,
): Promise<PiLinkScanActionResult> {
  const { orgId } = actor;
  switch (action) {
    case "state":
      return succeeded(getPiScanSession(orgId));
    case "start": {
      if (await piUpdateRunning())
        return { status: 409, body: { success: false, message: "A system update is running." } };
      const result = await startPiScanSession({
        orgId,
        userId: actor.userId,
        jwtClaims: actor.jwtClaims,
        body: (body ?? {}) as PiScanSessionStartBody,
      });
      if (!result.ok)
        return {
          status: result.status,
          body: { success: false, message: result.message, code: result.code },
        };
      return succeeded(result.state);
    }
    case "pause":
      return refused(pausePiScanSession(orgId), "No scan is running.");
    case "resume":
      return refused(resumePiScanSession(orgId), "No scan is paused.");
    case "stop":
      return succeeded(stopPiScanSession(orgId));
    case "emergencyStop":
      return refused(await emergencyStopPiScanSession(orgId), "No scan is running.");
    case "feed":
      return refused(requestPiScanFeed(orgId), "No scan is running.");
    case "resetStats":
      return refused(resetPiScanSessionStats(orgId), "No scan session to reset.");
    case "settings": {
      const settings = (body ?? {}) as PiScanSessionSettingsBody;
      return refused(
        updatePiScanSettings(
          orgId,
          settings.foilType,
          settings.preferredSetCodes,
          settings.autoFeed,
          settings.condition,
          settings,
        ),
        "No scan is running.",
      );
    }
    case "removal": {
      if (!isRemovalAction(body))
        return { status: 400, body: { success: false, message: "Invalid removal action." } };
      return refused(
        await updatePiScanRemoval(orgId, actor.userId, body),
        "The removal queue is busy or the selection is unavailable.",
      );
    }
  }
}
