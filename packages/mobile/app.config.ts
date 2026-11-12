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

const optionalEnv = (key: string): string | undefined =>
  process.env[key] || undefined;

const easProjectId = env("EAS_PROJECT_ID");

const collectionWidgetConfiguration = {
  title: "Collection",
  description: "Show all collections or pick one.",
  parameters: {
    collection: {
      title: "Collection",
      type: "enum" as const,
      dynamic: true,
      values: [{ name: "All collections", value: "all" }],
      default: "all",
    },
  },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mault",
  slug: "mault",
  scheme: "mault",
  version: JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8")).version,
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: optionalEnv("MOBILE_IOS_BUNDLE_ID"),
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
    package: optionalEnv("MOBILE_ANDROID_PACKAGE"),
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
    [
      "expo-widgets",
      {
        widgets: [
          {
            name: "CollectionValue",
            displayName: "Collection value",
            description: "Value of all collections or one, and how much it changed since the last day.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium", "accessoryRectangular", "accessoryInline"],
              configuration: collectionWidgetConfiguration,
            },
          },
          {
            name: "TotalCards",
            displayName: "Total cards",
            description: "How many cards are in all collections or one.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium", "accessoryRectangular", "accessoryInline"],
              configuration: collectionWidgetConfiguration,
            },
          },
          {
            name: "TopCards",
            displayName: "Top cards",
            description: "The most valuable card of each collection, or the top cards of one collection.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium"],
              configuration: collectionWidgetConfiguration,
            },
          },
          {
            name: "CardOfTheDay",
            displayName: "Card of the day",
            description: "A random card or two from your collections, new every day. Great for deck ideas.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium"],
              configuration: collectionWidgetConfiguration,
            },
          },
          {
            name: "CardReview",
            displayName: "Card review",
            description: "Accept scans that need review or save them for later.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium", "accessoryRectangular", "accessoryInline"],
            },
          },
          {
            name: "Notifications",
            displayName: "Notifications",
            description: "Pending trade offers and alerts.",
            ios: {
              supportedFamilies: ["systemSmall", "accessoryCircular", "accessoryRectangular", "accessoryInline"],
            },
          },
          {
            name: "ScannerActivity",
            displayName: "Scanners",
            description: "Which scanners are running, their progress and scan rate, and any sorter errors.",
            ios: {
              supportedFamilies: ["systemSmall", "systemMedium", "accessoryRectangular", "accessoryInline"],
            },
          },
        ],
      },
    ],
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
