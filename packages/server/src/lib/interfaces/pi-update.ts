export interface PiUpdateCheck {
  available: boolean;
  installedVersion: string | null;
  latestVersion: string | null;
}
