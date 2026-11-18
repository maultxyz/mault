import {
  MACHINE_CAMERA_FRAME_MAX_BYTES,
  MACHINE_ID_PATTERN,
  PI_HOST_MACHINE_ID,
  machineCommandBodySchema,
  machineStatusInputSchema,
  type MachineCommand,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  findMachineStatus,
  listMachineStatuses,
  publishMachineStatus,
  readMachineCameraFrame,
  removeMachineStatus,
  renewMachineCameraLease,
  sendMachineCommand,
  storeMachineCameraFrame,
} from "../lib/machine-status";
import { grabCameraFrame } from "../lib/pi-scan/camera";
import {
  emergencyStopPiScanSession,
  getPiScanMachineSource,
  pausePiScanSession,
  resumePiScanSession,
} from "../lib/pi-scan/session";
import {
  markRequestAsReadOnly,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../middleware/auth";

function machineIdOf(c: Context<AppEnv>): string | null {
  const machineId = c.req.param("machineId") ?? "";
  return MACHINE_ID_PATTERN.test(machineId) && machineId !== PI_HOST_MACHINE_ID ? machineId : null;
}

async function runPiHostCommand(orgId: string, command: MachineCommand): Promise<boolean> {
  if (command === "pause") return !!pausePiScanSession(orgId);
  if (command === "resume") return !!resumePiScanSession(orgId);
  return !!(await emergencyStopPiScanSession(orgId));
}

const frameUploadLimit = bodyLimit({
  maxSize: MACHINE_CAMERA_FRAME_MAX_BYTES,
  onError: (c) => c.json({ success: false, message: "Frame is too large." }, 413),
});

export const machinesRouter = new Hono<AppEnv>()
  .use("*", requireAuth, requireOrg)
  .get("/", (c) => c.json({ success: true, data: listMachineStatuses(c.get("orgId")) }))
  .put("/:machineId/status", markRequestAsReadOnly, rejectWhileImpersonating, async (c) => {
    const machineId = machineIdOf(c);
    if (!machineId) return c.json({ success: false, message: "Invalid machine." }, 400);
    const input = machineStatusInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ success: false, message: "Invalid machine status." }, 400);
    const status = publishMachineStatus(c.get("orgId"), machineId, "station", input.data);
    return c.json({ success: true, data: status });
  })
  .delete("/:machineId/status", markRequestAsReadOnly, rejectWhileImpersonating, (c) => {
    const machineId = machineIdOf(c);
    if (!machineId) return c.json({ success: false, message: "Invalid machine." }, 400);
    removeMachineStatus(c.get("orgId"), machineId);
    return c.json({ success: true });
  })
  .post("/:machineId/commands", markRequestAsReadOnly, rejectWhileImpersonating, async (c) => {
    const orgId = c.get("orgId");
    const machineId = c.req.param("machineId");
    const body = machineCommandBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ success: false, message: "Invalid command." }, 400);
    const status = findMachineStatus(orgId, machineId);
    if (!status) return c.json({ success: false, message: "This machine is offline." }, 404);
    if (status.source === "piHost") {
      const applied = await runPiHostCommand(orgId, body.data.command);
      return c.json({ success: applied, message: applied ? undefined : "The machine can't do that right now." });
    }
    const event = sendMachineCommand(orgId, machineId, body.data.command);
    return c.json({ success: true, data: event });
  })
  .put("/:machineId/camera-frame", markRequestAsReadOnly, rejectWhileImpersonating, frameUploadLimit, async (c) => {
    const machineId = machineIdOf(c);
    if (!machineId) return c.json({ success: false, message: "Invalid machine." }, 400);
    const bytes = Buffer.from(await c.req.arrayBuffer());
    if (bytes.length === 0) return c.json({ success: false, message: "Empty frame." }, 400);
    const result = storeMachineCameraFrame(c.get("orgId"), machineId, bytes);
    return c.json({ success: result.stored, data: { keepSending: result.keepSending } });
  })
  .get("/:machineId/camera-frame", async (c) => {
    const orgId = c.get("orgId");
    const machineId = c.req.param("machineId");
    const status = findMachineStatus(orgId, machineId);
    if (!status?.hasCamera) return c.json({ success: false, message: "No camera." }, 404);
    if (status.source === "piHost") {
      const source = getPiScanMachineSource(orgId);
      try {
        const frame = await grabCameraFrame(source?.cameraId ?? undefined);
        return c.body(new Uint8Array(frame), 200, {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
        });
      } catch {
        return c.json({ success: false, message: "Camera is unavailable." }, 503);
      }
    }
    renewMachineCameraLease(orgId, machineId);
    const frame = readMachineCameraFrame(orgId, machineId);
    if (!frame) return c.body(null, 204, { "Cache-Control": "no-store" });
    return c.body(new Uint8Array(frame.bytes), 200, {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "X-Frame-Captured-At": String(frame.capturedAt),
    });
  });
