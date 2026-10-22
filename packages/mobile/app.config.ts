import type { ConfigContext, ExpoConfig } from "expo/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootEnvPath = resolve(__dirname, "../../.env");
if (existsSync(rootEnvPath)) {
  try {
    process.loadEnvFile(rootEnvPath);
  } catch {}
}

const env = (key: string, fallback = ""): string =>
  process.env[key] ?? fallback;

const easProjectId = env("EAS_PROJECT_ID");

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mault",
  slug: "mault",
  scheme: "mault",
  version: JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8")).version,
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: env("MOBILE_IOS_BUNDLE_ID", "xyz.mault.app"),
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        "Mault uses the camera to identify cards as they pass through your sorter.",
      NSBluetoothAlwaysUsageDescription:
        "Mault connects to your card sorter over Bluetooth.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: env("MOBILE_ANDROID_PACKAGE", "xyz.mault.app"),
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1447e6",
    },
    permissions: ["android.permission.CAMERA"],
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      { image: "./assets/splash-icon.png", imageWidth: 160, backgroundColor: "#1447e6" },
    ],
    "expo-secure-store",
    "expo-sqlite",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: false,
        neverForLocation: true,
        bluetoothAlwaysPermission:
          "Mault connects to your card sorter over Bluetooth.",
      },
    ],
    ["expo-build-properties", { ios: { deploymentTarget: "16.4" } }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: env("MOBILE_API_URL", "https://mault.xyz"),
    webUrl: env("MOBILE_WEB_URL", "https://mault.xyz"),
    authProvider: env("MOBILE_AUTH_PROVIDER", env("AUTH_PROVIDER", "neon")),
    neonAuthUrl: env("MOBILE_NEON_AUTH_URL", env("VITE_NEON_AUTH_URL")),
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
});
