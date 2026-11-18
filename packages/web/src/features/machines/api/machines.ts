import { apiDelete, apiPost, apiPut, getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  MACHINES_PATH,
  type MachineCameraFrameUploadResult,
  type MachineCommand,
  type MachineStatus,
  type MachineStatusInput,
} from "@magic-vault/shared";

function machinePath(machineId: string, action: string): string {
  return `/api${MACHINES_PATH}/${encodeURIComponent(machineId)}/${action}`;
}

export function publishMachineStatus(machineId: string, input: MachineStatusInput) {
  return apiPut<{ success: boolean; data?: MachineStatus }>(
    machinePath(machineId, "status"),
    input,
  );
}

export function removeMachineStatus(machineId: string) {
  return apiDelete<{ success: boolean }>(machinePath(machineId, "status"));
}

export async function removeMachineStatusOnPageExit(machineId: string) {
  const headers = await getAuthHeaders();
  void fetch(`${API_BASE}${machinePath(machineId, "status")}`, {
    method: "DELETE",
    headers,
    keepalive: true,
  }).catch(() => undefined);
}

export async function sendMachineCommand(machineId: string, command: MachineCommand) {
  const result = await apiPost<{ success: boolean; message?: string }>(
    machinePath(machineId, "commands"),
    { command },
  );
  if (!result.success) throw new Error(result.message ?? "Command failed");
  return result;
}

export async function uploadMachineCameraFrame(
  machineId: string,
  frame: Blob,
): Promise<MachineCameraFrameUploadResult> {
  const res = await fetch(`${API_BASE}${machinePath(machineId, "camera-frame")}`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg", ...(await getAuthHeaders()) },
    body: frame,
  });
  if (!res.ok) return { keepSending: false };
  const body = (await res.json()) as { data?: MachineCameraFrameUploadResult };
  return { keepSending: !!body.data?.keepSending };
}

export async function fetchMachineCameraFrame(machineId: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}${machinePath(machineId, "camera-frame")}`, {
    headers: await getAuthHeaders(),
  });
  if (res.status !== 200) return null;
  return res.blob();
}
