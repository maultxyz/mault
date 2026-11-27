import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  isFirmwareFeatureSupported,
  parseWifiStatus,
  SORTER_LINK_URL_MAX_LENGTH,
  sorterLinkDeviceUrl,
  type SorterWifiFormValues,
  type SorterWifiStatus,
} from "@magic-vault/shared";
import { createSorterLink, deleteSorterLink } from "@/features/devices/api/devices";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { API_BASE } from "@/lib/constants/config";
import { SORTER_WIFI_RESPONSE_TIMEOUT_MS, SORTER_WIFI_STATUS_REFETCH_MS } from "@/lib/constants/sorter";
import type { SorterWifiControls, SorterWifiResult } from "@/lib/interfaces/sorter";

export function useSorterWifi(): SorterWifiControls {
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SorterWifiStatus | null>(null);
  const { isReady, hasWifi, board, firmwareVersion, isCloudConnection, device, sendRequest } = sorter;

  const needsFirmware =
    isReady && !hasWifi && board === "esp32" && !isFirmwareFeatureSupported(firmwareVersion, "wifiRemote");
  const needsWifiBoard = isReady && !hasWifi && !needsFirmware;
  const isSupported = isReady && hasWifi;
  const sharesRadioWithBluetooth = isSupported && board === "uno_r4";
  const canConfigure = isSupported && !isCloudConnection && !!device;

  const request = useCallback(
    async (command: object): Promise<SorterWifiResult> => {
      const { line } = await sendRequest(command, SORTER_WIFI_RESPONSE_TIMEOUT_MS);
      if (!line) return { ok: false, error: null };
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        if (parsed.status === "ok") {
          return { ok: true, restarting: parsed.restarting === true, serverLinkRemovalFailed: false };
        }
        return { ok: false, error: typeof parsed.error === "string" ? parsed.error : null };
      } catch {
        return { ok: false, error: null };
      }
    },
    [sendRequest],
  );

  const refresh = useCallback(async () => {
    const { line } = await sendRequest({ getWifi: true }, SORTER_WIFI_RESPONSE_TIMEOUT_MS);
    const parsed = line ? parseWifiStatus(line) : null;
    if (parsed) setStatus(parsed);
  }, [sendRequest]);

  useEffect(() => {
    if (!isSupported) {
      setStatus(null);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), SORTER_WIFI_STATUS_REFETCH_MS);
    return () => clearInterval(timer);
  }, [isSupported, refresh]);

  const invalidateLinks = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["sorter-links"] }),
    [queryClient],
  );

  const configure = useCallback(
    async ({ ssid, password }: SorterWifiFormValues): Promise<SorterWifiResult> => {
      if (!device) return { ok: false, error: null };
      const link = await createSorterLink(device.guid).catch(() => null);
      if (!link) return { ok: false, error: null };
      const url = link.url ?? sorterLinkDeviceUrl(API_BASE);
      if (url.length > SORTER_LINK_URL_MAX_LENGTH) return { ok: false, error: null };
      const cloud = await request({ setCloud: { url, token: link.token } });
      if (!cloud.ok) return cloud;
      const wifi = await request({ setWifi: { ssid, password } });
      void invalidateLinks();
      if (wifi.ok && !wifi.restarting) await refresh();
      return wifi;
    },
    [device, request, refresh, invalidateLinks],
  );

  const forget = useCallback(async (): Promise<SorterWifiResult> => {
    if (!device) return { ok: false, error: null };
    const cleared = await request({ clearWifi: true });
    if (!cleared.ok) return cleared;
    const serverLinkRemovalFailed = await deleteSorterLink(device.guid)
      .then(() => false)
      .catch(() => true);
    void invalidateLinks();
    if (!cleared.restarting) await refresh();
    return { ...cleared, serverLinkRemovalFailed };
  }, [device, request, refresh, invalidateLinks]);

  return {
    isSupported,
    needsWifiBoard,
    needsFirmware,
    sharesRadioWithBluetooth,
    canConfigure,
    isCloudConnection,
    status,
    configure,
    forget,
  };
}
