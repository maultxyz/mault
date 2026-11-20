import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { BUILD_SETUP_PARAMS } from "@/lib/constants/build";

export function prerenderEnvSignature(): string {
  return JSON.stringify([AUTH_PROVIDER]);
}

export function searchChangesPrerenderedPage(search: string): boolean {
  const params = new URLSearchParams(search);
  return Object.values(BUILD_SETUP_PARAMS).some((name) => params.has(name));
}
