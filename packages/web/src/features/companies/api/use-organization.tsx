import { useOrgLocal } from "./use-organization.local";
import { useOrgNeon } from "./use-organization.neon";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

export const useOrg = AUTH_PROVIDER === "local" ? useOrgLocal : useOrgNeon;
