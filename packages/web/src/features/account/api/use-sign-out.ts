import { signOut } from "@/lib/auth";
import { clearImpersonation } from "@/lib/auth/impersonation";
import type { SignOutOptions } from "@/lib/interfaces/account";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useSignOut({ staysOnPage = false }: SignOutOptions = {}) {
  const navigate = useNavigate();

  return useCallback(async () => {
    clearImpersonation();
    await signOut();
    if (!staysOnPage) navigate("/", { replace: true });
  }, [navigate, staysOnPage]);
}
