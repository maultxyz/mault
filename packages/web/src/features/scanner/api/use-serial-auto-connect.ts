import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStations } from "@/features/scanner/api/use-stations";
import { readBleDeviceMap } from "@/features/scanner/lib/ble-device-map";
import { isFlashInProgress } from "@/features/scanner/lib/esp32-flasher";
import {
  AUTO_CONNECT_PLUG_DELAY_MS,
  AUTO_CONNECT_SETTLE_MS,
} from "@/lib/constants/scanner";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSerialAutoConnect() {
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const { connectPortToStandby, connectBluetoothDeviceToStandby } =
    useStations();
  const connectRef = useRef({
    port: connectPortToStandby,
    bluetooth: connectBluetoothDeviceToStandby,
  });
  connectRef.current = {
    port: connectPortToStandby,
    bluetooth: connectBluetoothDeviceToStandby,
  };
  const autoConnectGuids = devices
    .filter((device) => device.autoConnect)
    .map((device) => device.guid)
    .sort()
    .join(",");

  useEffect(() => {
    if (!autoConnectGuids) return;
    const autoGuids = new Set(autoConnectGuids.split(","));
    const controller = new AbortController();
    const pendingBluetooth = new Set<string>();
    let queue: Promise<void> = Promise.resolve();

    const enqueue = (waitMs: number, run: () => Promise<void>) => {
      queue = queue
        .then(async () => {
          if (waitMs > 0) await delay(waitMs);
          if (controller.signal.aborted || isFlashInProgress()) return;
          await run();
          await delay(AUTO_CONNECT_SETTLE_MS);
        })
        .catch((err) => console.error("[auto-connect] failed:", err));
    };

    const serial = navigator.serial;
    if (serial) {
      const tryPort = (port: SerialPort, waitMs: number) =>
        enqueue(waitMs, async () => {
          if (port.readable) return;
          await connectRef.current.port(port);
        });
      void serial
        .getPorts()
        .then((ports) => ports.forEach((port) => tryPort(port, 0)));
      serial.addEventListener(
        "connect",
        (event) =>
          tryPort(event.target as SerialPort, AUTO_CONNECT_PLUG_DELAY_MS),
        { signal: controller.signal },
      );
    }

    const bluetooth = navigator.bluetooth;
    if (bluetooth && typeof bluetooth.getDevices === "function") {
      const bleMap = readBleDeviceMap();
      const handleAdvertisement = (event: BluetoothAdvertisingEvent) => {
        const device = event.device;
        if (device.gatt?.connected || pendingBluetooth.has(device.id)) return;
        pendingBluetooth.add(device.id);
        enqueue(0, async () => {
          try {
            if (!device.gatt?.connected) {
              await connectRef.current.bluetooth(device);
            }
          } finally {
            pendingBluetooth.delete(device.id);
          }
        });
      };
      void bluetooth
        .getDevices()
        .then((granted) => {
          for (const device of granted) {
            if (!autoGuids.has(bleMap[device.id])) continue;
            if (typeof device.watchAdvertisements !== "function") continue;
            device.addEventListener(
              "advertisementreceived",
              handleAdvertisement,
              {
                signal: controller.signal,
              },
            );
            void device
              .watchAdvertisements({ signal: controller.signal })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    return () => controller.abort();
  }, [autoConnectGuids]);
}
