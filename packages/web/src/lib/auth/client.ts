import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import { runtimeEnv } from "@/lib/runtime-env";

const neonAuthProxyPath = runtimeEnv("VITE_NEON_AUTH_PROXY_PATH");

export const neon = createClient({
  auth: {
    url: neonAuthProxyPath
      ? `${window.location.origin}${neonAuthProxyPath}`
      : (runtimeEnv("VITE_NEON_AUTH_URL") as string),
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: runtimeEnv("VITE_NEON_DATA_API_URL") as string,
  },
});
