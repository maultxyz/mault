export interface PiUpdateCheck {
  available: boolean;
  installedVersion: string | null;
  latestVersion: string | null;
}

export interface PiInstalledRelease {
  version: string;
  manifestUrl: string;
}

export interface PiInstalledKernel {
  name: string;
  installedAt: number;
}

export interface PiRebootStatus {
  rebootRequired: boolean;
  bootId: string | null;
}
