import AuthGuardLocal from "./local/auth-guard";
import AuthGuardNeon from "./neon/auth-guard";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

export default AUTH_PROVIDER === "local" ? AuthGuardLocal : AuthGuardNeon;
