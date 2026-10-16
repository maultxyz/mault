import Constants from "expo-constants";
import type { AppExtraConfig, AuthProvider } from "@/lib/interfaces/config";

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtraConfig>;

export const API_BASE = (extra.apiUrl ?? "https://mault.xyz").replace(/\/$/, "");
export const WEB_URL = (extra.webUrl ?? API_BASE).replace(/\/$/, "");
export const AUTH_PROVIDER: AuthProvider =
  extra.authProvider === "local" ? "local" : "neon";
export const NEON_AUTH_URL = (extra.neonAuthUrl ?? "").replace(/\/$/, "");
