import { z } from "zod";
import { SORTER_LINK_DEVICE_PATH, WIFI_PASSWORD_MAX_LENGTH, WIFI_PASSWORD_MIN_LENGTH, WIFI_SSID_MAX_LENGTH } from "./constants/sorter-link.constant";
import { formValidationMessage } from "./form-validation";
import type { CloudLinkState, SorterWifiStatus, WifiLinkState } from "./interfaces/sorter-link.interface";
import { parseSerialReply } from "./serial-protocol";

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export const sorterWifiFormSchema = z.object({
  ssid: z
    .string()
    .min(1, formValidationMessage("wifiSsidRequired"))
    .refine(
      (value) => utf8ByteLength(value) <= WIFI_SSID_MAX_LENGTH,
      formValidationMessage("wifiSsidTooLong", { max: WIFI_SSID_MAX_LENGTH }),
    ),
  password: z
    .string()
    .refine(
      (value) =>
        value.length === 0 || (value.length >= WIFI_PASSWORD_MIN_LENGTH && value.length <= WIFI_PASSWORD_MAX_LENGTH),
      formValidationMessage("wifiPassword", { min: WIFI_PASSWORD_MIN_LENGTH, max: WIFI_PASSWORD_MAX_LENGTH }),
    ),
});

export type SorterWifiFormValues = z.infer<typeof sorterWifiFormSchema>;

export function parseWifiStatus(line: string): SorterWifiStatus | null {
  const parsed = parseSerialReply(line);
  if (typeof parsed?.wifi !== "string" || typeof parsed.cloud !== "string") return null;
  return {
    wifi: parsed.wifi as WifiLinkState,
    ssid: typeof parsed.ssid === "string" ? parsed.ssid : null,
    ip: typeof parsed.ip === "string" ? parsed.ip : null,
    rssi: typeof parsed.rssi === "number" ? parsed.rssi : null,
    cloud: parsed.cloud as CloudLinkState,
    host: typeof parsed.host === "string" ? parsed.host : null,
  };
}

export function sorterLinkDeviceUrl(apiBaseUrl: string): string {
  const url = new URL(`${apiBaseUrl.replace(/\/$/, "")}/api${SORTER_LINK_DEVICE_PATH}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
