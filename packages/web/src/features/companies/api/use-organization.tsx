import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { useOrgLocal } from "./use-organization.local";
import { useOrgNeon } from "./use-organization.neon";

export const useOrg = AUTH_PROVIDER === "local" ? useOrgLocal : useOrgNeon;
