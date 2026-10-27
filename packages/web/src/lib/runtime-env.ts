import type { RuntimeEnvKey } from "@/lib/interfaces/runtime-env";

export function runtimeEnv(key: RuntimeEnvKey): string | undefined {
  const value =
    typeof window === "undefined" ? undefined : window.__ENV__?.[key];
  if (value) return value;
  const built = import.meta.env[key] as string | undefined;
  return built || undefined;
}
