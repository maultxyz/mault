import {
  formatPiPairingCode,
  PI_LINK_PAIRING_SECRET_HEADER,
  PI_LINK_PUBLIC_PAIRINGS_PATH,
  type PiLinkPairingCreated,
  type PiLinkPairingPoll,
} from "@magic-vault/shared";
import {
  PI_LINK_DEVICE_PAIRING_POLL_MS,
  PI_LINK_DEVICE_PAIRING_RETRY_MS,
} from "../constants/pi-hosts";
import { PI_LINK_REQUEST_TIMEOUT_MS } from "../constants/scan-host";
import type { PiLinkDeviceCredential } from "../interfaces/pi-hosts";

export const piLinkPairingRuntime = {
  fetch: (input: string, init?: RequestInit) => fetch(input, init),
  wait: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

async function readData<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { success?: boolean; data?: T } | null;
  return body?.success ? (body.data ?? null) : null;
}

async function createPairing(baseUrl: string, hostName: string): Promise<PiLinkPairingCreated | null> {
  const response = await piLinkPairingRuntime.fetch(`${baseUrl}${PI_LINK_PUBLIC_PAIRINGS_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: hostName }),
    signal: AbortSignal.timeout(PI_LINK_REQUEST_TIMEOUT_MS),
  });
  return readData<PiLinkPairingCreated>(response);
}

async function pollPairing(
  baseUrl: string,
  pairing: PiLinkPairingCreated,
): Promise<PiLinkPairingPoll | null> {
  const response = await piLinkPairingRuntime.fetch(
    `${baseUrl}${PI_LINK_PUBLIC_PAIRINGS_PATH}/${pairing.code}`,
    {
      headers: { [PI_LINK_PAIRING_SECRET_HEADER]: pairing.pollSecret },
      signal: AbortSignal.timeout(PI_LINK_REQUEST_TIMEOUT_MS),
    },
  );
  return readData<PiLinkPairingPoll>(response);
}

async function waitForClaim(
  baseUrl: string,
  pairing: PiLinkPairingCreated,
): Promise<PiLinkDeviceCredential | null> {
  const expiresAt = Date.parse(pairing.expiresAt);
  while (piLinkPairingRuntime.now() < expiresAt) {
    await piLinkPairingRuntime.wait(PI_LINK_DEVICE_PAIRING_POLL_MS);
    const poll = await pollPairing(baseUrl, pairing).catch(() => null);
    if (poll?.status === "expired") return null;
    if (poll?.status === "claimed")
      return {
        baseUrl,
        token: poll.token,
        orgId: poll.orgId,
        hostGuid: poll.hostGuid,
        hostName: poll.hostName,
      };
  }
  return null;
}

export async function pairPiLink(
  baseUrl: string,
  hostName: string,
  onPairingCode: (pairing: PiLinkPairingCreated) => void,
): Promise<PiLinkDeviceCredential> {
  for (;;) {
    const pairing = await createPairing(baseUrl, hostName).catch((error: unknown) => {
      console.error("[pi-link] could not request a pairing code:", error);
      return null;
    });
    if (!pairing) {
      await piLinkPairingRuntime.wait(PI_LINK_DEVICE_PAIRING_RETRY_MS);
      continue;
    }
    onPairingCode(pairing);
    console.log(
      `[pi-link] Pairing code ${formatPiPairingCode(pairing.code)}: enter it in Mault to link this Pi (expires ${pairing.expiresAt}).`,
    );
    const credential = await waitForClaim(baseUrl, pairing);
    if (credential) return credential;
  }
}
