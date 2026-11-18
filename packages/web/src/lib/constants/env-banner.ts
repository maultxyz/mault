import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { runtimeEnv } from "@/lib/runtime-env";

export const ENV_BANNER_CONFIG = {
  local: "bg-pink-400/90 text-pink-950",
  selfHosting: "bg-pink-400/90 text-pink-950",
  development: "bg-amber-400/90 text-amber-950",
  qa: "bg-violet-500/90 text-violet-50",
} satisfies Record<string, string>;

const RUNTIME_APP_ENV = runtimeEnv("VITE_APP_ENV");

export const APP_ENV =
  RUNTIME_APP_ENV === "local" && AUTH_PROVIDER === "local"
    ? "selfHosting"
    : RUNTIME_APP_ENV;
