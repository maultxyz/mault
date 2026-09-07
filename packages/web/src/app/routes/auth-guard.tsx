import { useAuthSession } from "@/lib/auth";
import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function AuthGuard() {
  const { data, isPending } = useAuthSession();
  const isAuthenticated = !!data?.user;

  useEffect(() => {
    if (isAuthenticated) void import("@/app/routes/app/layout");
  }, [isAuthenticated]);

  if (isPending) return null;
  if (!isAuthenticated) return <Navigate to="/auth/sign-in" replace />;
  return <Outlet />;
}
