import pkg from "../../package.json";
import { getShortLinkBaseUrl } from "./constants/urls";
import { getLatestFirmwareVersion } from "./firmware-releases";
import { isPiHost, isPiSorter } from "./pi-host";

export function serverVersionInfo(billingEnabled: boolean) {
  return {
    version: pkg.version,
    piHost: isPiHost(),
    latestFirmwareVersion: getLatestFirmwareVersion(),
    piSorter: isPiSorter(),
    piController: isPiSorter(),
    shortLinkBaseUrl: getShortLinkBaseUrl(),
    billingEnabled,
  };
}
