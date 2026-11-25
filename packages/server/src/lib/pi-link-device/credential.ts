import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PI_LINK_DEVICE_CREDENTIAL_FILE } from "../constants/pi-hosts";
import type { PiLinkDeviceCredential } from "../interfaces/pi-hosts";
import { maultStateDirectory } from "../mault-state-directory";

export const piLinkCredentialRuntime = {
  path: () => join(maultStateDirectory(), PI_LINK_DEVICE_CREDENTIAL_FILE),
};

function isCredential(value: unknown): value is PiLinkDeviceCredential {
  const credential = value as Partial<PiLinkDeviceCredential> | null;
  return (
    typeof credential?.baseUrl === "string" &&
    typeof credential.token === "string" &&
    typeof credential.orgId === "string" &&
    typeof credential.hostGuid === "string" &&
    typeof credential.hostName === "string"
  );
}

export async function readPiLinkCredential(): Promise<PiLinkDeviceCredential | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(piLinkCredentialRuntime.path(), "utf8"));
    return isCredential(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writePiLinkCredential(credential: PiLinkDeviceCredential): Promise<void> {
  const target = piLinkCredentialRuntime.path();
  await mkdir(maultStateDirectory(), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(credential), { mode: 0o600, flush: true });
  await rename(temporary, target);
}

export async function deletePiLinkCredential(): Promise<void> {
  await unlink(piLinkCredentialRuntime.path()).catch(() => {});
}
