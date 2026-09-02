import { localAuthProvider } from "./local";
import { neonAuthProvider } from "./neon";
import type { AuthProvider } from "./types";

export const authProvider: AuthProvider =
  process.env.AUTH_PROVIDER === "local" ? localAuthProvider : neonAuthProvider;

export type { AuthProvider, OrgRole } from "./types";
