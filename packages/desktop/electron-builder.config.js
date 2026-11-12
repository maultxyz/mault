const CHANNELS = {
  production: {
    appIdSuffix: "",
    productName: "MAULT",
    packageName: "mault-desktop",
    artifactPrefix: "MAULT",
    icon: "../web/public/icon/icon-512.png",
    releaseTag: "desktop-latest",
    updateChannel: "latest",
  },
  development: {
    appIdSuffix: ".dev",
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

const baseAppId = process.env.MAULT_DESKTOP_APP_ID;
if (!baseAppId) {
  throw new Error("Set MAULT_DESKTOP_APP_ID to your own reverse-domain app ID before packaging.");
}

const releaseRepository = process.env.MAULT_DESKTOP_RELEASE_REPOSITORY ?? process.env.GITHUB_REPOSITORY;
if (!releaseRepository) {
  throw new Error("Set MAULT_DESKTOP_RELEASE_REPOSITORY (owner/repo) so the update feed points at your own releases.");
}

module.exports = {
  appId: `${baseAppId}${channel.appIdSuffix}`,
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
      NSCameraUsageDescription: "Mault uses the camera to scan your cards.",
      NSBluetoothAlwaysUsageDescription: "Mault uses Bluetooth to connect to your card sorter.",
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
    url: `https://github.com/${releaseRepository}/releases/download/${channel.releaseTag}`,
    channel: channel.updateChannel,
  },
};
