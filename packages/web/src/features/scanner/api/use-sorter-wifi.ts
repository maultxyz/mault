import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createSorterLink,
  deleteSorterLink,
  sorterLinksQueryOptions,
} from "@/features/scanner/api/sorter-link";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  defaultSorterLinkDeviceUrl,
  parseWifiStatus,
} from "@/features/scanner/lib/sorter-link";
import {
  SORTER_WIFI_RESPONSE_TIMEOUT_MS,
  SORTER_WIFI_STATUS_REFETCH_MS,
} from "@/lib/constants/timing";
import type {
  SorterWifiControls,
  SorterWifiResult,
} from "@/lib/interfaces/sorter-wifi";
import type { SorterWifiFormValues } from "@/schemas/sorter-wifi.schema";
import {
  isFirmwareFeatureSupported,
  SORTER_LINK_URL_MAX_LENGTH,
  type SorterWifiStatus,
} from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function useSorterWifi(): SorterWifiControls {
  const {
    isReady,
    board,
    firmwareVersion,
    transport,
    sendRequest,
    isRouteBusy,
  } = useSerial();
  const device = useDevice();
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SorterWifiStatus | null>(null);

  const needsEsp32 = isReady && board !== "esp32";
  const needsFirmware =
    isReady &&
    board === "esp32" &&
    !isFirmwareFeatureSupported(firmwareVersion, "wifiRemote");
  const isSupported = isReady && !needsEsp32 && !needsFirmware;
  const canConfigure = isSupported && transport !== "cloud" && !!device;

  const request = useCallback(
    async (command: object): Promise<SorterWifiResult> => {
      const { line } = await sendRequest(
        command,
        SORTER_WIFI_RESPONSE_TIMEOUT_MS,
      );
      if (!line) return { ok: false, error: null };
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        if (parsed.status === "ok") return { ok: true };
        return {
          ok: false,
          error: typeof parsed.error === "string" ? parsed.error : null,
        };
      } catch {
        return { ok: false, error: null };
      }
    },
    [sendRequest],
  );

  const refresh = useCallback(async () => {
    if (isRouteBusy()) return;
    const { line } = await sendRequest(
      { getWifi: true },
      SORTER_WIFI_RESPONSE_TIMEOUT_MS,
    );
    const parsed = line ? parseWifiStatus(line) : null;
    if (parsed) setStatus(parsed);
  }, [sendRequest, isRouteBusy]);

  useEffect(() => {
    if (!isSupported) {
      setStatus(null);
      return;
    }
    void refresh();
    const id = setInterval(() => void refresh(), SORTER_WIFI_STATUS_REFETCH_MS);
    return () => clearInterval(id);
  }, [isSupported, refresh]);

  const invalidateLinks = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: sorterLinksQueryOptions(activeOrg?.id).queryKey,
      }),
    [queryClient, activeOrg?.id],
  );

  const configure = useCallback(
    async ({
      ssid,
      password,
    }: SorterWifiFormValues): Promise<SorterWifiResult> => {
      if (!device) return { ok: false, error: null };
      const link = await createSorterLink(device.guid).catch(() => null);
      if (!link?.success || !link.data) return { ok: false, error: null };
      const url = link.data.url ?? defaultSorterLinkDeviceUrl();
      if (url.length > SORTER_LINK_URL_MAX_LENGTH) {
        return { ok: false, error: null };
      }
      const cloud = await request({
        setCloud: { url, token: link.data.token },
      });
      if (!cloud.ok) return cloud;
      const wifi = await request({ setWifi: { ssid, password } });
      void invalidateLinks();
      if (wifi.ok) await refresh();
      return wifi;
    },
    [device, request, refresh, invalidateLinks],
  );

  const forget = useCallback(async (): Promise<SorterWifiResult> => {
    if (!device) return { ok: false, error: null };
    const cleared = await request({ clearWifi: true });
    if (!cleared.ok) return cleared;
    await deleteSorterLink(device.guid).catch(() => null);
    void invalidateLinks();
    await refresh();
    return cleared;
  }, [device, request, refresh, invalidateLinks]);

  return {
    isSupported,
    needsEsp32,
    needsFirmware,
    canConfigure,
    status,
    configure,
    forget,
  };
}
