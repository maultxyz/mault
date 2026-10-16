export type AuthProvider = "neon" | "local";

export interface AppExtraConfig {
  apiUrl: string;
  webUrl: string;
  authProvider: string;
  neonAuthUrl: string;
}
