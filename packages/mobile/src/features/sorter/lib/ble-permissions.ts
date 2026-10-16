import { PermissionsAndroid, Platform } from "react-native";
import { ANDROID_SPLIT_BLE_PERMISSIONS_API } from "@/lib/constants/sorter";

export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const { PERMISSIONS, RESULTS } = PermissionsAndroid;
  const needed =
    Number(Platform.Version) >= ANDROID_SPLIT_BLE_PERMISSIONS_API
      ? [PERMISSIONS.BLUETOOTH_SCAN, PERMISSIONS.BLUETOOTH_CONNECT]
      : [PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(needed);
  return needed.every((permission) => results[permission] === RESULTS.GRANTED);
}
