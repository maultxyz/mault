import { and, eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { devices } from "../../db/schema";
import {
  PI_SCAN_PORT_DRAIN_MS,
  PI_SCAN_SERVO_TIMEOUT_MS,
  PI_SCAN_STATUS_TIMEOUT_MS,
} from "../constants/pi-scan";
import {
  claimSorterPort,
  releaseSorterPort,
  SorterPortError,
} from "../pi-serial-port";
import { getPiScanSession } from "./session";
import { SorterLink } from "./sorter-link";

export type BottomLeverPosition = "open" | "closed";

export type BottomLeverResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function moduleCountFor(
  jwtClaims: string,
  orgId: string,
  hardwareId: string,
): Promise<number | null> {
  const [device] = await authQuery(jwtClaims, (tx) =>
    tx
      .select({ moduleCount: devices.moduleCount })
      .from(devices)
      .where(
        and(
          eq(devices.orgId, orgId),
          eq(devices.hardwareId, hardwareId),
          eq(devices.isDeleted, false),
        ),
      )
      .limit(1),
  );
  return device?.moduleCount ?? null;
}

export async function setPiBottomLevers(input: {
  orgId: string;
  jwtClaims: string;
  position: BottomLeverPosition;
}): Promise<BottomLeverResult> {
  const session = getPiScanSession(input.orgId);
  if (session.phase === "running" || session.phase === "paused") {
    return { ok: false, status: 409, message: "A scan is using the sorter." };
  }

  let port;
  try {
    port = await claimSorterPort("levers", { hupcl: false });
  } catch (err) {
    if (err instanceof SorterPortError && err.reason === "missing") {
      return { ok: false, status: 409, message: "No sorter is plugged into the Pi." };
    }
    if (err instanceof SorterPortError && err.reason === "busy") {
      return {
        ok: false,
        status: 409,
        message: "The sorter port is in use. Disconnect it in the browser, then try again.",
      };
    }
    return { ok: false, status: 409, message: "The sorter port could not be opened." };
  }

  const link = new SorterLink(port);
  try {
    await sleep(PI_SCAN_PORT_DRAIN_MS);
    const status = await link.command(
      { getStatus: true },
      PI_SCAN_STATUS_TIMEOUT_MS,
    );
    const hardwareId = typeof status.id === "string" ? status.id.trim() : "";
    if (!hardwareId) {
      return { ok: false, status: 409, message: "The sorter did not report an id." };
    }
    const moduleCount = await moduleCountFor(
      input.jwtClaims,
      input.orgId,
      hardwareId,
    );
    if (!moduleCount) {
      return {
        ok: false,
        status: 400,
        message:
          "This sorter is not registered yet. Connect it once from the app, then try again.",
      };
    }
    for (let module = 1; module <= moduleCount; module += 1) {
      const line = await link.command(
        { servo: "bottom", module, position: input.position },
        PI_SCAN_SERVO_TIMEOUT_MS,
      );
      if (line.status !== "ok") {
        const message =
          typeof line.error === "string"
            ? line.error
            : "The sorter did not move a bottom lever.";
        return { ok: false, status: 409, message };
      }
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "The sorter did not move.";
    return { ok: false, status: 409, message };
  } finally {
    link.close();
    releaseSorterPort("levers");
  }
}
