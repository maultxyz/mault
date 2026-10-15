import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { StationToastTitle } from "@/features/scanner/components/station-toast-title";
import type { AppToast, ToastData, ToastMessage } from "@/lib/interfaces/toast";
import { toast } from "@/lib/toast";
import { useMemo, useRef } from "react";

export function useSharedStationName(): string | null {
  const { station, index } = useStation();
  const { connectedStationIds } = useStations();
  const name = useStationName(station, index);
  const hasOtherSorter = [...connectedStationIds].some(
    (id) => id !== station.id,
  );
  return hasOtherSorter ? name : null;
}

export function useStationToast(): AppToast {
  const { station } = useStation();
  const sharedName = useSharedStationName();
  const sharedNameRef = useRef(sharedName);
  sharedNameRef.current = sharedName;
  const stationId = station.id;

  return useMemo(() => {
    const prefix = `${stationId}:`;

    const scopeId = (id: string | number | undefined) =>
      id === undefined || String(id).startsWith(prefix)
        ? id
        : `${prefix}${id}`;

    const scopeData = (data: ToastData): ToastData =>
      data?.id === undefined ? data : { ...data, id: scopeId(data.id) };

    const label = (message: ToastMessage): ToastMessage => {
      const name = sharedNameRef.current;
      if (!name) return message;
      return (
        <StationToastTitle stationName={name}>
          {typeof message === "function" ? message() : message}
        </StationToastTitle>
      );
    };

    const scoped =
      (show: (message: ToastMessage, data?: ToastData) => string | number) =>
      (message: ToastMessage, data?: ToastData) =>
        show(label(message), scopeData(data));

    return Object.assign(scoped(toast), toast, {
      success: scoped(toast.success),
      info: scoped(toast.info),
      warning: scoped(toast.warning),
      error: scoped(toast.error),
      loading: scoped(toast.loading),
      message: scoped(toast.message),
      custom: (...[jsx, data]: Parameters<AppToast["custom"]>) =>
        toast.custom(jsx, scopeData(data)),
      dismiss: (id?: string | number) => toast.dismiss(scopeId(id)),
    }) as AppToast;
  }, [stationId]);
}
