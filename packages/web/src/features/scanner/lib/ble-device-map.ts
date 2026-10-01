import { BLE_DEVICE_MAP_STORAGE_KEY } from "@/lib/constants/storage-keys";

export function readBleDeviceMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BLE_DEVICE_MAP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberBleDevice(bleDeviceId: string, deviceGuid: string) {
  const map = readBleDeviceMap();
  if (map[bleDeviceId] === deviceGuid) return;
  try {
    localStorage.setItem(
      BLE_DEVICE_MAP_STORAGE_KEY,
      JSON.stringify({ ...map, [bleDeviceId]: deviceGuid }),
    );
  } catch {}
}
