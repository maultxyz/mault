import { signOut } from "@/lib/auth";
import { clearImpersonation } from "@/lib/auth/impersonation";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useSignOut() {
  const navigate = useNavigate();

  return useCallback(async () => {
    clearImpersonation();
    await signOut();
    navigate("/", { replace: true });
  }, [navigate]);
}
