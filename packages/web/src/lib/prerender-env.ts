import { AUTH_PROVIDER } from "@/lib/constants/auth";

export function prerenderEnvSignature(): string {
  return JSON.stringify([AUTH_PROVIDER]);
}
