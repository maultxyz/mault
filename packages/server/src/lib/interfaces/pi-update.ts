export interface PiUpdateCheck {
  available: boolean;
  installedVersion: string | null;
  latestVersion: string | null;
}

export interface PiInstalledRelease {
  version: string;
  manifestUrl: string;
}
