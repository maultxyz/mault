import { runtimeEnv } from "@/lib/runtime-env";

export const API_BASE = runtimeEnv("VITE_API_URL") ?? "";
