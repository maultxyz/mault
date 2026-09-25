import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useAuthSession } from "@/lib/auth";
import { Navigate, Outlet } from "react-router-dom";

export default function AuthGuard() {
  const { data, isPending } = useAuthSession();
  if (isPending) return <AppLoadingScreen />;
  if (!data?.user) return <Navigate to="/auth/sign-in" replace />;
  return <Outlet />;
}
