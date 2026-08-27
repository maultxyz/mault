// Build-time constant (Vite inlines import.meta.env.* at build time), so
// every AUTH_PROVIDER === "local" check below is dead-code-eliminated out of
// the Neon-mode bundle and vice versa - safe to reference from module scope
// in hook-dispatch ternaries (see use-organization.tsx) without violating
// the rules of hooks, since the choice never changes within a page load.
export const AUTH_PROVIDER: "neon" | "local" =
  import.meta.env.VITE_AUTH_PROVIDER === "local" ? "local" : "neon";
