export const AUTH_PROVIDER: "neon" | "local" =
  import.meta.env.VITE_AUTH_PROVIDER === "local" ? "local" : "neon";
