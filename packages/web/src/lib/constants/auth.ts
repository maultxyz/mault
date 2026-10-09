export const AUTH_PROVIDER: "neon" | "local" =
  import.meta.env.VITE_AUTH_PROVIDER === "local" ? "local" : "neon";

export const NEON_SOCIAL_PROVIDERS = ["github", "google"] as const;
