import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useAuthSession } from "@/lib/auth";
import { signInPathReturningTo } from "@/lib/auth-redirect";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function AuthGuard() {
  const { data, isPending } = useAuthSession();
  const { pathname, search } = useLocation();
  if (isPending) return <AppLoadingScreen />;
  if (!data?.user) {
    return <Navigate to={signInPathReturningTo(pathname + search)} replace />;
  }
  return <Outlet />;
}
