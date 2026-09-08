import { AUTH_PROVIDER } from "@/lib/auth/provider";
import AuthGuardLocal from "./auth-guard.local";
import AuthGuardNeon from "./auth-guard.neon";

export default AUTH_PROVIDER === "local" ? AuthGuardLocal : AuthGuardNeon;
