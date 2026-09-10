import { AUTH_PROVIDER } from "@/lib/auth/provider";
import AuthGuardLocal from "./local/auth-guard";
import AuthGuardNeon from "./neon/auth-guard";

export default AUTH_PROVIDER === "local" ? AuthGuardLocal : AuthGuardNeon;
