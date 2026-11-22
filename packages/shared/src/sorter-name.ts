import {
  RECENT_SORTERS_MAX,
  SORTER_BLUETOOTH_NAME_MAX_BYTES,
  SORTER_NAME_UNSAFE_CHARACTERS,
} from "./constants/sorters.constant";
import { isFirmwareFeatureSupported } from "./constants/firmware.constant";
import type {
  RecentSorter,
  SorterNameSyncLink,
} from "./interfaces/devices.interface";

function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

export function sorterBluetoothName(deviceName: string): string {
  let name = "";
  let byteLength = 0;
  for (const character of deviceName
    .replace(SORTER_NAME_UNSAFE_CHARACTERS, "")
    .trim()) {
    const characterBytes = utf8ByteLength(character.codePointAt(0) ?? 0);
    if (byteLength + characterBytes > SORTER_BLUETOOTH_NAME_MAX_BYTES) break;
    name += character;
    byteLength += characterBytes;
  }
  return name.trim();
}

export function sorterNameCommandFor(
  firmwareVersion: string | null | undefined,
  reportedName: unknown,
  deviceName: string,
): { setName: string } | null {
  if (!isFirmwareFeatureSupported(firmwareVersion, "sorterName")) return null;
  const name = sorterBluetoothName(deviceName);
  if (!name || name === reportedName) return null;
  return { setName: name };
}

export async function syncSorterBluetoothName(
  link: SorterNameSyncLink,
  firmwareVersion: string | null | undefined,
  reportedName: unknown,
  deviceName: string,
): Promise<string | null> {
  const command = sorterNameCommandFor(
    firmwareVersion,
    reportedName,
    deviceName,
  );
  if (!command) return null;
  const reply = await link.runWhenIdle(() => link.sendParsed(command));
  return reply?.status === "ok" && typeof reply.name === "string"
    ? reply.name
    : null;
}

export function rememberRecentSorter(
  recentSorters: readonly RecentSorter[],
  connected: RecentSorter,
): RecentSorter[] {
  return [
    connected,
    ...recentSorters.filter(
      (sorter) =>
        sorter.id !== connected.id &&
        sorter.deviceGuid !== connected.deviceGuid,
    ),
  ].slice(0, RECENT_SORTERS_MAX);
}

export function recentSortersWithCurrentNames(
  recentSorters: readonly RecentSorter[],
  devices: readonly { guid: string; name: string }[] | undefined,
): RecentSorter[] {
  if (!devices) return [...recentSorters];
  const namesByGuid = new Map(devices.map((device) => [device.guid, device.name]));
  return recentSorters.flatMap((sorter) => {
    const name = namesByGuid.get(sorter.deviceGuid);
    return name === undefined ? [] : [{ ...sorter, name }];
  });
}
