import { runtimeEnv } from "@/lib/runtime-env";

export const SERVED_FROM_PI_BUNDLE = runtimeEnv("VITE_PI_HOST") === "true";
