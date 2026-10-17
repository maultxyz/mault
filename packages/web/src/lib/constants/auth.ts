import { runtimeEnv } from "@/lib/runtime-env";

export const AUTH_PROVIDER: "neon" | "local" =
  runtimeEnv("VITE_AUTH_PROVIDER") === "local" ? "local" : "neon";

export const NEON_SOCIAL_PROVIDERS = ["github", "google"] as const;
