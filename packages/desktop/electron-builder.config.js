const RELEASE_DOWNLOAD_BASE_URL = "https://github.com/dishwasher-detergent/mault/releases/download";

const CHANNELS = {
  production: {
    appId: "xyz.mault.desktop",
    productName: "MAULT",
    packageName: "mault-desktop",
    artifactPrefix: "MAULT",
    icon: "../web/public/icon/icon-512.png",
    releaseTag: "desktop-latest",
    updateChannel: "latest",
  },
  development: {
    appId: "xyz.mault.desktop.dev",
    productName: "MAULT Dev",
    packageName: "mault-desktop-dev",
    artifactPrefix: "MAULT-Dev",
    icon: "static/app-icon-development.png",
    releaseTag: "desktop-dev",
    updateChannel: "dev",
  },
};

const channelName = process.env.MAULT_DESKTOP_CHANNEL ?? "production";
const channel = CHANNELS[channelName];
if (!channel) throw new Error(`Unknown desktop channel: ${channelName}`);

module.exports = {
  appId: channel.appId,
  productName: channel.productName,
  extraMetadata: {
    name: channel.packageName,
  },
  copyright: "Copyright © Mault LLC",
  artifactName: `${channel.artifactPrefix}-\${version}-\${os}-\${arch}.\${ext}`,
  directories: {
    output: "release",
    buildResources: "build",
  },
  files: ["dist/**", "package.json"],
  icon: channel.icon,
  mac: {
    category: "public.app-category.utilities",
    target: ["dmg", "zip"],
    hardenedRuntime: true,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    extendInfo: {
      NSCameraUsageDescription: "MAULT uses the camera to scan your cards.",
      NSBluetoothAlwaysUsageDescription: "MAULT uses Bluetooth to connect to your card sorter.",
    },
  },
  win: {
    target: "nsis",
    extraResources: [
      { from: "native/koffi", to: "koffi" },
      { from: "native/scanner-helper", to: "scanner-helper" },
    ],
  },
  nsis: {
    oneClick: true,
    perMachine: false,
  },
  linux: {
    target: "AppImage",
    category: "Utility",
  },
  publish: {
    provider: "generic",
    url: `${RELEASE_DOWNLOAD_BASE_URL}/${channel.releaseTag}`,
    channel: channel.updateChannel,
  },
};
