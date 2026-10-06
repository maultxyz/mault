import { localAuthProvider } from "./local";
import { neonAuthProvider } from "./neon";
import type { AuthProvider } from "../lib/interfaces/auth";

export const authProvider: AuthProvider =
  process.env.AUTH_PROVIDER === "local" ? localAuthProvider : neonAuthProvider;

