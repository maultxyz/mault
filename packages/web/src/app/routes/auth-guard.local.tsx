import { useAuthSession } from "@/lib/auth";
import { Navigate, Outlet } from "react-router-dom";

export default function AuthGuard() {
  const { data, isPending } = useAuthSession();
  if (isPending) return null;
  if (!data?.user) return <Navigate to="/auth/sign-in" replace />;
  return <Outlet />;
}
