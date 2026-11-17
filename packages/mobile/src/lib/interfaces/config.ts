export type AuthProvider = "neon" | "local";

export interface AppExtraConfig {
  apiUrl: string;
  webUrl: string;
  shortLinkUrl: string;
  authProvider: string;
  neonAuthUrl: string;
}

export interface PublicVersionInfo {
  shortLinkBaseUrl?: string | null;
}
