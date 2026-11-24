import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import { NEON_AUTH_BASE_URL } from "@/lib/constants/auth";
import { runtimeEnv } from "@/lib/runtime-env";

export const neon = createClient({
  auth: {
    url: NEON_AUTH_BASE_URL,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: runtimeEnv("VITE_NEON_DATA_API_URL") as string,
  },
});
