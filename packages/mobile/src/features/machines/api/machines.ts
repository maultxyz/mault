import { MACHINES_PATH, type MachineCommand } from "@magic-vault/shared";
import { apiPost, getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";

function machinePath(machineId: string, action: string): string {
  return `/api${MACHINES_PATH}/${encodeURIComponent(machineId)}/${action}`;
}

export async function sendMachineCommand(machineId: string, command: MachineCommand) {
  const result = await apiPost<{ success: boolean; message?: string }>(machinePath(machineId, "commands"), {
    command,
  });
  if (!result.success) throw new Error(result.message ?? "Command failed");
  return result;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function fetchMachineCameraFrameUri(machineId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}${machinePath(machineId, "camera-frame")}`, {
    headers: await getAuthHeaders(),
  });
  if (res.status !== 200) return null;
  return blobToDataUri(await res.blob());
}
