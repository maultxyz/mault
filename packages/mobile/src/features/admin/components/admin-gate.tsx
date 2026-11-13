import { Redirect } from "expo-router";
import { useRole } from "@/hooks/use-role";
import type { AdminGateProps } from "@/lib/interfaces/admin";

export function AdminGate({ requiresPlatformAdmin = false, children }: AdminGateProps) {
  const { isAdmin, isStaff } = useRole();
  if (requiresPlatformAdmin ? !isAdmin : !isStaff) return <Redirect href="/account" />;
  return children;
}
